import { db } from '../src/shared/db/index.js';
import { bpmn_definitions, companies } from '../src/shared/db/schema.js';
import { eq } from 'drizzle-orm';

const xmlData = `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI" xmlns:dc="http://www.omg.org/spec/DD/20100524/DC" xmlns:di="http://www.omg.org/spec/DD/20100524/DI" id="Definitions_1" targetNamespace="http://bpmn.io/schema/bpmn">
  <bpmn:process id="Process_1" isExecutable="false">
    <!-- Start -->
    <bpmn:startEvent id="StartEvent_1">
      <bpmn:outgoing>Flow_Start_To_DeptHead</bpmn:outgoing>
    </bpmn:startEvent>

    <!-- Step 1: Department Head (Always required) -->
    <bpmn:userTask id="Task_DeptHead" name="Department Head Approval">
      <bpmn:documentation>{"assigneeType":"Department Role","assigneeValue":"Department_Head"}</bpmn:documentation>
      <bpmn:incoming>Flow_Start_To_DeptHead</bpmn:incoming>
      <bpmn:outgoing>Flow_DeptHead_To_Gateway</bpmn:outgoing>
    </bpmn:userTask>
    <bpmn:sequenceFlow id="Flow_Start_To_DeptHead" sourceRef="StartEvent_1" targetRef="Task_DeptHead" />

    <!-- Gateway for Amount check -->
    <bpmn:exclusiveGateway id="Gateway_AmountCheck" name="Check Amount" default="Flow_Gateway_To_Admin">
      <bpmn:incoming>Flow_DeptHead_To_Gateway</bpmn:incoming>
      <bpmn:outgoing>Flow_Gateway_To_CFO</bpmn:outgoing>
      <bpmn:outgoing>Flow_Gateway_To_Admin</bpmn:outgoing>
    </bpmn:exclusiveGateway>
    <bpmn:sequenceFlow id="Flow_DeptHead_To_Gateway" sourceRef="Task_DeptHead" targetRef="Gateway_AmountCheck" />

    <!-- Step 2 (High Amount): CFO Approval -->
    <bpmn:userTask id="Task_CFO" name="CFO Approval">
      <bpmn:documentation>{"assigneeType":"Global Role","assigneeValue":"CFO"}</bpmn:documentation>
      <bpmn:incoming>Flow_Gateway_To_CFO</bpmn:incoming>
      <bpmn:outgoing>Flow_CFO_To_CEO</bpmn:outgoing>
    </bpmn:userTask>
    <bpmn:sequenceFlow id="Flow_Gateway_To_CFO" name="amount &gt;= 5000" sourceRef="Gateway_AmountCheck" targetRef="Task_CFO">
      <bpmn:conditionExpression xsi:type="bpmn:tFormalExpression">amount &gt;= 5000</bpmn:conditionExpression>
    </bpmn:sequenceFlow>

    <!-- Step 3 (High Amount): CEO Approval -->
    <bpmn:userTask id="Task_CEO" name="CEO Approval">
      <bpmn:documentation>{"assigneeType":"Global Role","assigneeValue":"MD"}</bpmn:documentation>
      <bpmn:incoming>Flow_CFO_To_CEO</bpmn:incoming>
      <bpmn:outgoing>Flow_CEO_To_Admin</bpmn:outgoing>
    </bpmn:userTask>
    <bpmn:sequenceFlow id="Flow_CFO_To_CEO" sourceRef="Task_CFO" targetRef="Task_CEO" />

    <!-- Step 4 (Merge &#38; Final): Admin Approval -->
    <bpmn:userTask id="Task_Admin" name="Admin Final Approval">
      <bpmn:documentation>{"assigneeType":"Global Role","assigneeValue":"Admin"}</bpmn:documentation>
      <bpmn:incoming>Flow_Gateway_To_Admin</bpmn:incoming>
      <bpmn:incoming>Flow_CEO_To_Admin</bpmn:incoming>
      <bpmn:outgoing>Flow_Admin_To_End</bpmn:outgoing>
    </bpmn:userTask>
    <!-- Default flow if amount &#60; 5000 skips CFO and CEO and goes straight to Admin -->
    <bpmn:sequenceFlow id="Flow_Gateway_To_Admin" name="amount &#60; 5000" sourceRef="Gateway_AmountCheck" targetRef="Task_Admin" />
    <bpmn:sequenceFlow id="Flow_CEO_To_Admin" sourceRef="Task_CEO" targetRef="Task_Admin" />

    <!-- End -->
    <bpmn:endEvent id="EndEvent_1">
      <bpmn:incoming>Flow_Admin_To_End</bpmn:incoming>
    </bpmn:endEvent>
    <bpmn:sequenceFlow id="Flow_Admin_To_End" sourceRef="Task_Admin" targetRef="EndEvent_1" />
  </bpmn:process>
  
  <bpmndi:BPMNDiagram id="BPMNDiagram_1">
    <bpmndi:BPMNPlane id="BPMNPlane_1" bpmnElement="Process_1">
      <bpmndi:BPMNShape id="_BPMNShape_StartEvent_2" bpmnElement="StartEvent_1">
        <dc:Bounds x="152" y="102" width="36" height="36" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="Task_DeptHead_di" bpmnElement="Task_DeptHead">
        <dc:Bounds x="240" y="80" width="100" height="80" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNEdge id="Flow_Start_To_DeptHead_di" bpmnElement="Flow_Start_To_DeptHead">
        <di:waypoint x="188" y="120" />
        <di:waypoint x="240" y="120" />
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNShape id="Gateway_AmountCheck_di" bpmnElement="Gateway_AmountCheck" isMarkerVisible="true">
        <dc:Bounds x="395" y="95" width="50" height="50" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNEdge id="Flow_DeptHead_To_Gateway_di" bpmnElement="Flow_DeptHead_To_Gateway">
        <di:waypoint x="340" y="120" />
        <di:waypoint x="395" y="120" />
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNShape id="Task_CFO_di" bpmnElement="Task_CFO">
        <dc:Bounds x="500" y="80" width="100" height="80" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNEdge id="Flow_Gateway_To_CFO_di" bpmnElement="Flow_Gateway_To_CFO">
        <di:waypoint x="445" y="120" />
        <di:waypoint x="500" y="120" />
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNShape id="Task_CEO_di" bpmnElement="Task_CEO">
        <dc:Bounds x="660" y="80" width="100" height="80" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNEdge id="Flow_CFO_To_CEO_di" bpmnElement="Flow_CFO_To_CEO">
        <di:waypoint x="600" y="120" />
        <di:waypoint x="660" y="120" />
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNShape id="Task_Admin_di" bpmnElement="Task_Admin">
        <dc:Bounds x="660" y="230" width="100" height="80" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNEdge id="Flow_Gateway_To_Admin_di" bpmnElement="Flow_Gateway_To_Admin">
        <di:waypoint x="420" y="145" />
        <di:waypoint x="420" y="270" />
        <di:waypoint x="660" y="270" />
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="Flow_CEO_To_Admin_di" bpmnElement="Flow_CEO_To_Admin">
        <di:waypoint x="710" y="160" />
        <di:waypoint x="710" y="230" />
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNShape id="EndEvent_1_di" bpmnElement="EndEvent_1">
        <dc:Bounds x="822" y="252" width="36" height="36" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNEdge id="Flow_Admin_To_End_di" bpmnElement="Flow_Admin_To_End">
        <di:waypoint x="760" y="270" />
        <di:waypoint x="822" y="270" />
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

  // Clear existing workflows for Item Request
  await db.delete(bpmn_definitions).where(eq(bpmn_definitions.companyId, companyId));

  // Insert the new fully dynamic workflow
  await db.insert(bpmn_definitions).values({
    companyId,
    name: 'Dynamic Approval Flow (Amount Based)',
    documentType: 'Item Requisition',
    department: 'Global',
    xmlData
  });

  console.log("Successfully seeded dynamic BPMN workflow with Gateway and Conditions!");
  process.exit(0);
}

seed().catch(console.error);
