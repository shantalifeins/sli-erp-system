import { XMLParser, XMLBuilder } from 'fast-xml-parser';

export type BpmnAssigneeType = 'Department Role' | 'Global Role' | 'Designation' | 'Specific User';

export interface BpmnTaskAssignment {
  id: string;
  name: string;
  assigneeType: BpmnAssigneeType;
  assigneeValue: string;
}

/**
 * Safely evaluates a condition string against a context object.
 * e.g. condition: "amount > 5000", context: { amount: 15000, department: "IT" }
 */
function evaluateCondition(condition: string, context: Record<string, any>): boolean {
  if (!condition || condition.trim() === '') return true; // Empty condition is true (default flow)
  
  try {
    // Extract variables from context
    const keys = Object.keys(context);
    const values = Object.values(context);
    
    // Create a safe function to evaluate the expression
    // using strictly the provided context variables
    const func = new Function(...keys, `return !!(${condition});`);
    return func(...values);
  } catch (error) {
    console.error(`Failed to evaluate BPMN condition: ${condition}`, error);
    return false;
  }
}

/**
 * Parses BPMN XML and dynamically traverses the graph starting from the start event.
 * At exclusive gateways, it evaluates sequence flow conditions against the provided context.
 * Returns a linear array of assigned tasks.
 */
export function evaluateWorkflowPath(xmlData: string, context: Record<string, any> = {}): BpmnTaskAssignment[] {
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "@_"
  });
  
  let jsonObj: any;
  try {
    jsonObj = parser.parse(xmlData);
  } catch(e) {
    console.error("XML Parsing Error", e);
    return [];
  }

  // 1. Locate the process definition
  const defs = jsonObj["bpmn:definitions"] || jsonObj.definitions;
  if (!defs) return [];
  
  const process = defs["bpmn:process"] || defs.process;
  if (!process) return [];

  // Helper to ensure array format even if single element
  const toArray = (obj: any) => {
    if (!obj) return [];
    return Array.isArray(obj) ? obj : [obj];
  };

  const startEvents = toArray(process["bpmn:startEvent"]);
  const userTasks = toArray(process["bpmn:userTask"]);
  const exclusiveGateways = toArray(process["bpmn:exclusiveGateway"]);
  const sequenceFlows = toArray(process["bpmn:sequenceFlow"]);

  if (startEvents.length === 0) return [];

  const startEvent = startEvents[0];
  const startId = startEvent["@_id"];

  // 2. Build graph maps
  // Mapping of outgoing flows from each element
  const outgoingFlowsMap: Record<string, any[]> = {};
  
  sequenceFlows.forEach(flow => {
    const source = flow["@_sourceRef"];
    if (!outgoingFlowsMap[source]) {
      outgoingFlowsMap[source] = [];
    }
    outgoingFlowsMap[source].push(flow);
  });

  // Map of all elements by ID for quick lookup
  const elementsById: Record<string, { type: string, data: any }> = {};
  
  startEvents.forEach(e => elementsById[e["@_id"]] = { type: 'startEvent', data: e });
  userTasks.forEach(e => elementsById[e["@_id"]] = { type: 'userTask', data: e });
  exclusiveGateways.forEach(e => elementsById[e["@_id"]] = { type: 'exclusiveGateway', data: e });
  
  // Note: we can also capture EndEvents if needed, but for path building, stopping when no outgoing flow is enough.

  // 3. Traverse the graph
  const path: BpmnTaskAssignment[] = [];
  const visited = new Set<string>(); // to prevent infinite loops
  
  let currentId = startId;
  
  while (currentId) {
    if (visited.has(currentId)) {
      console.warn("BPMN loop detected at", currentId);
      break;
    }
    visited.add(currentId);

    const element = elementsById[currentId];
    if (!element) {
      // Reached an end event or unsupported element
      break; 
    }

    // Process current element
    if (element.type === 'userTask') {
      const taskData = element.data;
      const name = taskData["@_name"] || "Unnamed Task";
      
      // Parse custom configuration from bpmn:documentation
      let assigneeType: BpmnAssigneeType = 'Global Role';
      let assigneeValue = name.trim();
      let minAmount: number | undefined;
      
      const doc = taskData["bpmn:documentation"];
      if (doc) {
        try {
          const parsedDoc = typeof doc === 'string' ? JSON.parse(doc) : JSON.parse(doc["#text"] || "{}");
          if (parsedDoc.assigneeType) assigneeType = parsedDoc.assigneeType;
          if (parsedDoc.assigneeValue) assigneeValue = parsedDoc.assigneeValue;
          if (parsedDoc.minAmount !== undefined) minAmount = Number(parsedDoc.minAmount);
        } catch(e) {
          // It's not JSON, ignore
        }
      }

      // If a minAmount is defined and the context amount is less than it, SKIP this task
      const currentAmount = Number(context?.amount) || 0;
      const shouldInclude = minAmount === undefined || currentAmount >= minAmount;

      if (shouldInclude) {
        path.push({
          id: currentId,
          name: name,
          assigneeType,
          assigneeValue
        });
      }
    }

    // Find next hop
    const outgoing = outgoingFlowsMap[currentId] || [];
    if (outgoing.length === 0) {
      break; // End of path
    }

    if (element.type === 'exclusiveGateway') {
      // Evaluate conditions
      let chosenFlow = null;
      let defaultFlow = element.data["@_default"];

      for (const flow of outgoing) {
        const conditionNode = flow["bpmn:conditionExpression"];
        let conditionText = '';
        
        if (conditionNode) {
          // fast-xml-parser usually puts text in #text if there are attributes
          if (typeof conditionNode === 'string') {
            conditionText = conditionNode;
          } else if (conditionNode["#text"]) {
            conditionText = conditionNode["#text"];
          }
        }
        
        // Fallback to flow name if conditionExpression is missing but user typed on the line
        if (!conditionText && flow["@_name"]) {
          conditionText = flow["@_name"];
        }

        // Clean up expression (e.g. remove ${...} wrapper if it exists)
        conditionText = conditionText.trim();
        if (conditionText.startsWith('${') && conditionText.endsWith('}')) {
          conditionText = conditionText.substring(2, conditionText.length - 1);
        }

        if (conditionText) {
          const isTrue = evaluateCondition(conditionText, context);
          if (isTrue) {
            chosenFlow = flow;
            break; // Stop evaluating after first true condition
          }
        }
      }

      // If no condition matched, fallback to default flow or first flow
      if (!chosenFlow && defaultFlow) {
        chosenFlow = outgoing.find(f => f["@_id"] === defaultFlow);
      }
      
      if (!chosenFlow && outgoing.length > 0) {
        // Fallback: pick the first one if we can't determine (helps with malformed BPMN)
        chosenFlow = outgoing[0];
      }

      currentId = chosenFlow ? chosenFlow["@_targetRef"] : null;
    } else {
      // Sequence or Task - assume 1 outgoing flow (or just pick the first)
      currentId = outgoing[0]["@_targetRef"];
    }
  }

  return path;
}
