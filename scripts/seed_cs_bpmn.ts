import { db } from '../src/shared/db/index.js';
import { bpmn_definitions, companies } from '../src/shared/db/schema.js';
import { eq, and } from 'drizzle-orm';

const xmlData = `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI" xmlns:dc="http://www.omg.org/spec/DD/20100524/DC" xmlns:di="http://www.omg.org/spec/DD/20100524/DI" id="Definitions_1" targetNamespace="http://bpmn.io/schema/bpmn">
  <bpmn:process id="Process_CS_Evaluation" isExecutable="true">
    <bpmn:startEvent id="StartEvent_1">
      <bpmn:outgoing>Flow_Start_To_HeadOps</bpmn:outgoing>
    </bpmn:startEvent>

    <!-- Task: Head of Operations -->
    <bpmn:userTask id="Task_HeadOps" name="Head of Operations">
      <bpmn:documentation>{"assigneeType":"Global Role","assigneeValue":"Head of Operations"}</bpmn:documentation>
      <bpmn:incoming>Flow_Start_To_HeadOps</bpmn:incoming>
      <bpmn:outgoing>Flow_HeadOps_To_Gateway1</bpmn:outgoing>
    </bpmn:userTask>
    <bpmn:sequenceFlow id="Flow_Start_To_HeadOps" sourceRef="StartEvent_1" targetRef="Task_HeadOps" />

    <!-- Gateway 1: Check Amount > 5000 -->
    <bpmn:exclusiveGateway id="Gateway_1" name="Amount &gt; 5000?" default="Flow_Gateway1_To_End">
      <bpmn:incoming>Flow_HeadOps_To_Gateway1</bpmn:incoming>
      <bpmn:outgoing>Flow_Gateway1_To_CEO</bpmn:outgoing>
      <bpmn:outgoing>Flow_Gateway1_To_End</bpmn:outgoing>
    </bpmn:exclusiveGateway>
    <bpmn:sequenceFlow id="Flow_HeadOps_To_Gateway1" sourceRef="Task_HeadOps" targetRef="Gateway_1" />

    <bpmn:sequenceFlow id="Flow_Gateway1_To_End" name="&lt;= 5000" sourceRef="Gateway_1" targetRef="EndEvent_1" />

    <bpmn:sequenceFlow id="Flow_Gateway1_To_CEO" name="&gt; 5000" sourceRef="Gateway_1" targetRef="Task_CEO">
      <bpmn:conditionExpression xsi:type="bpmn:tFormalExpression">amount &gt; 5000</bpmn:conditionExpression>
    </bpmn:sequenceFlow>

    <!-- Task: CEO -->
    <bpmn:userTask id="Task_CEO" name="CEO">
      <bpmn:documentation>{"assigneeType":"Global Role","assigneeValue":"CEO"}</bpmn:documentation>
      <bpmn:incoming>Flow_Gateway1_To_CEO</bpmn:incoming>
      <bpmn:outgoing>Flow_CEO_To_Gateway2</bpmn:outgoing>
    </bpmn:userTask>

    <!-- Gateway 2: Check Amount > 100000 -->
    <bpmn:exclusiveGateway id="Gateway_2" name="Amount &gt; 100000?" default="Flow_Gateway2_To_End">
      <bpmn:incoming>Flow_CEO_To_Gateway2</bpmn:incoming>
      <bpmn:outgoing>Flow_Gateway2_To_EC</bpmn:outgoing>
      <bpmn:outgoing>Flow_Gateway2_To_End</bpmn:outgoing>
    </bpmn:exclusiveGateway>
    <bpmn:sequenceFlow id="Flow_CEO_To_Gateway2" sourceRef="Task_CEO" targetRef="Gateway_2" />

    <bpmn:sequenceFlow id="Flow_Gateway2_To_End" name="&lt;= 100000" sourceRef="Gateway_2" targetRef="EndEvent_1" />

    <bpmn:sequenceFlow id="Flow_Gateway2_To_EC" name="&gt; 100000" sourceRef="Gateway_2" targetRef="Task_EC">
      <bpmn:conditionExpression xsi:type="bpmn:tFormalExpression">amount &gt; 100000</bpmn:conditionExpression>
    </bpmn:sequenceFlow>

    <!-- Task: EC Committee -->
    <bpmn:userTask id="Task_EC" name="EC Committee">
      <bpmn:documentation>{"assigneeType":"Global Role","assigneeValue":"EC Committee"}</bpmn:documentation>
      <bpmn:incoming>Flow_Gateway2_To_EC</bpmn:incoming>
      <bpmn:outgoing>Flow_EC_To_End</bpmn:outgoing>
    </bpmn:userTask>
    <bpmn:sequenceFlow id="Flow_EC_To_End" sourceRef="Task_EC" targetRef="EndEvent_1" />

    <!-- End Event -->
    <bpmn:endEvent id="EndEvent_1">
      <bpmn:incoming>Flow_Gateway1_To_End</bpmn:incoming>
      <bpmn:incoming>Flow_Gateway2_To_End</bpmn:incoming>
      <bpmn:incoming>Flow_EC_To_End</bpmn:incoming>
    </bpmn:endEvent>
  </bpmn:process>

  <bpmndi:BPMNDiagram id="BPMNDiagram_1">
    <bpmndi:BPMNPlane id="BPMNPlane_1" bpmnElement="Process_CS_Evaluation">
      <bpmndi:BPMNShape id="_BPMNShape_StartEvent_2" bpmnElement="StartEvent_1">
        <dc:Bounds x="152" y="102" width="36" height="36" />
      </bpmndi:BPMNShape>
      
      <bpmndi:BPMNShape id="Task_HeadOps_di" bpmnElement="Task_HeadOps">
        <dc:Bounds x="240" y="80" width="100" height="80" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNEdge id="Flow_Start_To_HeadOps_di" bpmnElement="Flow_Start_To_HeadOps">
        <di:waypoint x="188" y="120" />
        <di:waypoint x="240" y="120" />
      </bpmndi:BPMNEdge>

      <bpmndi:BPMNShape id="Gateway_1_di" bpmnElement="Gateway_1" isMarkerVisible="true">
        <dc:Bounds x="395" y="95" width="50" height="50" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNEdge id="Flow_HeadOps_To_Gateway1_di" bpmnElement="Flow_HeadOps_To_Gateway1">
        <di:waypoint x="340" y="120" />
        <di:waypoint x="395" y="120" />
      </bpmndi:BPMNEdge>

      <bpmndi:BPMNShape id="Task_CEO_di" bpmnElement="Task_CEO">
        <dc:Bounds x="500" y="80" width="100" height="80" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNEdge id="Flow_Gateway1_To_CEO_di" bpmnElement="Flow_Gateway1_To_CEO">
        <di:waypoint x="445" y="120" />
        <di:waypoint x="500" y="120" />
      </bpmndi:BPMNEdge>

      <bpmndi:BPMNShape id="Gateway_2_di" bpmnElement="Gateway_2" isMarkerVisible="true">
        <dc:Bounds x="655" y="95" width="50" height="50" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNEdge id="Flow_CEO_To_Gateway2_di" bpmnElement="Flow_CEO_To_Gateway2">
        <di:waypoint x="600" y="120" />
        <di:waypoint x="655" y="120" />
      </bpmndi:BPMNEdge>

      <bpmndi:BPMNShape id="Task_EC_di" bpmnElement="Task_EC">
        <dc:Bounds x="760" y="80" width="100" height="80" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNEdge id="Flow_Gateway2_To_EC_di" bpmnElement="Flow_Gateway2_To_EC">
        <di:waypoint x="705" y="120" />
        <di:waypoint x="760" y="120" />
      </bpmndi:BPMNEdge>

      <bpmndi:BPMNShape id="EndEvent_1_di" bpmnElement="EndEvent_1">
        <dc:Bounds x="920" y="232" width="36" height="36" />
      </bpmndi:BPMNShape>

      <!-- Edges to End -->
      <bpmndi:BPMNEdge id="Flow_Gateway1_To_End_di" bpmnElement="Flow_Gateway1_To_End">
        <di:waypoint x="420" y="145" />
        <di:waypoint x="420" y="250" />
        <di:waypoint x="920" y="250" />
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="Flow_Gateway2_To_End_di" bpmnElement="Flow_Gateway2_To_End">
        <di:waypoint x="680" y="145" />
        <di:waypoint x="680" y="250" />
        <di:waypoint x="920" y="250" />
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="Flow_EC_To_End_di" bpmnElement="Flow_EC_To_End">
        <di:waypoint x="860" y="120" />
        <di:waypoint x="938" y="120" />
        <di:waypoint x="938" y="232" />
      </bpmndi:BPMNEdge>

    </bpmndi:BPMNPlane>
  </bpmndi:BPMNDiagram>
</bpmn:definitions>`;

async function seed() {
  const comp = await db.select().from(companies).limit(1);
  if (comp.length === 0) {
    console.log("No companies found in database!");
    return;
  }
  const companyId = comp[0].id;

  // Clear existing CS workflows
  await db.delete(bpmn_definitions).where(
    and(
      eq(bpmn_definitions.companyId, companyId),
      eq(bpmn_definitions.documentType, 'CS Evaluation')
    )
  );

  // Insert the new workflow
  await db.insert(bpmn_definitions).values({
    companyId,
    name: 'CS Evaluation Hierarchy Flow',
    documentType: 'CS Evaluation',
    department: 'Global',
    xmlData
  });

  console.log("Successfully seeded CS Evaluation BPMN workflow!");
  process.exit(0);
}

seed().catch(console.error);
