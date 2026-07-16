import * as dotenv from 'dotenv';
dotenv.config();

import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import { bpmn_definitions, companies } from './src/shared/db/schema.js';
import { eq } from 'drizzle-orm';

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL + (process.env.DATABASE_URL?.includes('?') ? '&' : '?') + 'ipv4=true',
  ssl: { rejectUnauthorized: false }
});
const db = drizzle(pool);

const csXml = `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI" xmlns:dc="http://www.omg.org/spec/DD/20100524/DC" xmlns:di="http://www.omg.org/spec/DD/20100524/DI" id="Definitions_CS" targetNamespace="http://bpmn.io/schema/bpmn">
  <bpmn:process id="Process_CS" isExecutable="true">
    <bpmn:startEvent id="StartEvent_CS">
      <bpmn:outgoing>Flow_CS1</bpmn:outgoing>
    </bpmn:startEvent>
    <bpmn:exclusiveGateway id="Gateway_CS1" name="Amount Check">
      <bpmn:incoming>Flow_CS1</bpmn:incoming>
      <bpmn:outgoing>Flow_CS_Low</bpmn:outgoing>
      <bpmn:outgoing>Flow_CS_Mid</bpmn:outgoing>
      <bpmn:outgoing>Flow_CS_High</bpmn:outgoing>
    </bpmn:exclusiveGateway>
    
    <!-- Low Branch (<= 5000) -->
    <bpmn:userTask id="Task_Low_Ops" name="Executive Vice President &amp; Head of Operations">
      <bpmn:documentation>{"assigneeType":"Designation","assigneeValue":"Executive Vice President &amp; Head of Operations"}</bpmn:documentation>
      <bpmn:incoming>Flow_CS_Low</bpmn:incoming>
      <bpmn:outgoing>Flow_Low_End</bpmn:outgoing>
    </bpmn:userTask>
    
    <!-- Mid Branch (5001 - 100000) -->
    <bpmn:userTask id="Task_Mid_Ops" name="Executive Vice President &amp; Head of Operations">
      <bpmn:documentation>{"assigneeType":"Designation","assigneeValue":"Executive Vice President &amp; Head of Operations"}</bpmn:documentation>
      <bpmn:incoming>Flow_CS_Mid</bpmn:incoming>
      <bpmn:outgoing>Flow_Mid_1</bpmn:outgoing>
    </bpmn:userTask>
    <bpmn:userTask id="Task_Mid_CEO" name="Chief Executive Officer">
      <bpmn:documentation>{"assigneeType":"Designation","assigneeValue":"Chief Executive Officer"}</bpmn:documentation>
      <bpmn:incoming>Flow_Mid_1</bpmn:incoming>
      <bpmn:outgoing>Flow_Mid_End</bpmn:outgoing>
    </bpmn:userTask>
    
    <!-- High Branch (> 100000) -->
    <bpmn:userTask id="Task_High_Ops" name="Executive Vice President &amp; Head of Operations">
      <bpmn:documentation>{"assigneeType":"Designation","assigneeValue":"Executive Vice President &amp; Head of Operations"}</bpmn:documentation>
      <bpmn:incoming>Flow_CS_High</bpmn:incoming>
      <bpmn:outgoing>Flow_High_1</bpmn:outgoing>
    </bpmn:userTask>
    <bpmn:userTask id="Task_High_CEO" name="Chief Executive Officer">
      <bpmn:documentation>{"assigneeType":"Designation","assigneeValue":"Chief Executive Officer"}</bpmn:documentation>
      <bpmn:incoming>Flow_High_1</bpmn:incoming>
      <bpmn:outgoing>Flow_High_End</bpmn:outgoing>
    </bpmn:userTask>

    <bpmn:endEvent id="EndEvent_CS">
      <bpmn:incoming>Flow_Low_End</bpmn:incoming>
      <bpmn:incoming>Flow_Mid_End</bpmn:incoming>
      <bpmn:incoming>Flow_High_End</bpmn:incoming>
    </bpmn:endEvent>
    
    <bpmn:sequenceFlow id="Flow_CS1" sourceRef="StartEvent_CS" targetRef="Gateway_CS1" />
    
    <bpmn:sequenceFlow id="Flow_CS_Low" name="amount &lt;= 5000" sourceRef="Gateway_CS1" targetRef="Task_Low_Ops">
      <bpmn:conditionExpression xsi:type="bpmn:tFormalExpression">amount &lt;= 5000</bpmn:conditionExpression>
    </bpmn:sequenceFlow>
    <bpmn:sequenceFlow id="Flow_CS_Mid" name="amount &gt; 5000 &amp;&amp; amount &lt;= 100000" sourceRef="Gateway_CS1" targetRef="Task_Mid_Ops">
      <bpmn:conditionExpression xsi:type="bpmn:tFormalExpression">amount &gt; 5000 &amp;&amp; amount &lt;= 100000</bpmn:conditionExpression>
    </bpmn:sequenceFlow>
    <bpmn:sequenceFlow id="Flow_CS_High" name="amount &gt; 100000" sourceRef="Gateway_CS1" targetRef="Task_High_Ops">
      <bpmn:conditionExpression xsi:type="bpmn:tFormalExpression">amount &gt; 100000</bpmn:conditionExpression>
    </bpmn:sequenceFlow>
    
    <!-- Flow Ends -->
    <bpmn:sequenceFlow id="Flow_Low_End" sourceRef="Task_Low_Ops" targetRef="EndEvent_CS" />
    
    <bpmn:sequenceFlow id="Flow_Mid_1" sourceRef="Task_Mid_Ops" targetRef="Task_Mid_CEO" />
    <bpmn:sequenceFlow id="Flow_Mid_End" sourceRef="Task_Mid_CEO" targetRef="EndEvent_CS" />
    
    <bpmn:sequenceFlow id="Flow_High_1" sourceRef="Task_High_Ops" targetRef="Task_High_CEO" />
    <bpmn:sequenceFlow id="Flow_High_End" sourceRef="Task_High_CEO" targetRef="EndEvent_CS" />
  </bpmn:process>
  <bpmndi:BPMNDiagram id="BPMNDiagram_1">
    <bpmndi:BPMNPlane id="BPMNPlane_1" bpmnElement="Process_CS">
      <bpmndi:BPMNShape id="StartEvent_CS_di" bpmnElement="StartEvent_CS">
        <dc:Bounds x="150" y="200" width="36" height="36" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="Gateway_CS1_di" bpmnElement="Gateway_CS1" isMarkerVisible="true">
        <dc:Bounds x="250" y="193" width="50" height="50" />
      </bpmndi:BPMNShape>
      
      <bpmndi:BPMNShape id="Task_Low_Ops_di" bpmnElement="Task_Low_Ops">
        <dc:Bounds x="400" y="80" width="100" height="80" />
      </bpmndi:BPMNShape>
      
      <bpmndi:BPMNShape id="Task_Mid_Ops_di" bpmnElement="Task_Mid_Ops">
        <dc:Bounds x="400" y="200" width="100" height="80" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="Task_Mid_CEO_di" bpmnElement="Task_Mid_CEO">
        <dc:Bounds x="600" y="200" width="100" height="80" />
      </bpmndi:BPMNShape>
      
      <bpmndi:BPMNShape id="Task_High_Ops_di" bpmnElement="Task_High_Ops">
        <dc:Bounds x="400" y="320" width="100" height="80" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="Task_High_CEO_di" bpmnElement="Task_High_CEO">
        <dc:Bounds x="600" y="320" width="100" height="80" />
      </bpmndi:BPMNShape>
      
      <bpmndi:BPMNShape id="EndEvent_CS_di" bpmnElement="EndEvent_CS">
        <dc:Bounds x="850" y="200" width="36" height="36" />
      </bpmndi:BPMNShape>
      
      <bpmndi:BPMNEdge id="Flow_CS1_di" bpmnElement="Flow_CS1">
        <di:waypoint x="186" y="218" />
        <di:waypoint x="250" y="218" />
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="Flow_CS_Low_di" bpmnElement="Flow_CS_Low">
        <di:waypoint x="275" y="193" />
        <di:waypoint x="275" y="120" />
        <di:waypoint x="400" y="120" />
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="Flow_CS_Mid_di" bpmnElement="Flow_CS_Mid">
        <di:waypoint x="300" y="218" />
        <di:waypoint x="400" y="218" />
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="Flow_CS_High_di" bpmnElement="Flow_CS_High">
        <di:waypoint x="275" y="243" />
        <di:waypoint x="275" y="360" />
        <di:waypoint x="400" y="360" />
      </bpmndi:BPMNEdge>
      
      <bpmndi:BPMNEdge id="Flow_Low_End_di" bpmnElement="Flow_Low_End">
        <di:waypoint x="500" y="120" />
        <di:waypoint x="868" y="120" />
        <di:waypoint x="868" y="200" />
      </bpmndi:BPMNEdge>
      
      <bpmndi:BPMNEdge id="Flow_Mid_1_di" bpmnElement="Flow_Mid_1">
        <di:waypoint x="500" y="240" />
        <di:waypoint x="600" y="240" />
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="Flow_Mid_End_di" bpmnElement="Flow_Mid_End">
        <di:waypoint x="700" y="240" />
        <di:waypoint x="850" y="218" />
      </bpmndi:BPMNEdge>
      
      <bpmndi:BPMNEdge id="Flow_High_1_di" bpmnElement="Flow_High_1">
        <di:waypoint x="500" y="360" />
        <di:waypoint x="600" y="360" />
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="Flow_High_End_di" bpmnElement="Flow_High_End">
        <di:waypoint x="700" y="360" />
        <di:waypoint x="868" y="360" />
        <di:waypoint x="868" y="236" />
      </bpmndi:BPMNEdge>
    </bpmndi:BPMNPlane>
  </bpmndi:BPMNDiagram>
</bpmn:definitions>`;

async function updateCSBPMN() {
  try {
    const allCompanies = await db.select().from(companies);
    console.log(`Found ${allCompanies.length} companies. Updating CS Evaluation BPMN...`);
    
    for (const company of allCompanies) {
      if (!company.id) continue;
      
      // Delete existing CS Evaluation BPMN
      await db.delete(bpmn_definitions).where(
        eq(bpmn_definitions.documentType, 'CS Evaluation')
      );
      
      // Insert new one
      await db.insert(bpmn_definitions).values({
        companyId: company.id,
        name: "CS Approval (Amount Wise)",
        documentType: "CS Evaluation",
        department: "Global",
        xmlData: csXml,
        isActive: true,
      });
      
      console.log(`Updated for company ${company.name}`);
    }
    
    console.log("Successfully updated all CS Evaluation BPMNs.");
    process.exit(0);
  } catch (error) {
    console.error("Error updating BPMN:", error);
    process.exit(1);
  }
}

updateCSBPMN();
