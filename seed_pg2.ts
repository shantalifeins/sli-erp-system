import pg from 'pg';
import * as dotenv from 'dotenv';
dotenv.config();

const { Pool } = pg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

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
    
    <!-- Low Branch -->
    <bpmn:userTask id="Task_Low_Ops" name="Head of Operations">
      <bpmn:documentation>{"assigneeType":"Designation","assigneeValue":"Head of Operations"}</bpmn:documentation>
      <bpmn:incoming>Flow_CS_Low</bpmn:incoming>
      <bpmn:outgoing>Flow_Low_End</bpmn:outgoing>
    </bpmn:userTask>
    
    <!-- Mid Branch -->
    <bpmn:userTask id="Task_Mid_Ops" name="Head of Operations">
      <bpmn:documentation>{"assigneeType":"Designation","assigneeValue":"Head of Operations"}</bpmn:documentation>
      <bpmn:incoming>Flow_CS_Mid</bpmn:incoming>
      <bpmn:outgoing>Flow_Mid_1</bpmn:outgoing>
    </bpmn:userTask>
    <bpmn:userTask id="Task_Mid_CEO" name="CEO">
      <bpmn:documentation>{"assigneeType":"Designation","assigneeValue":"CEO"}</bpmn:documentation>
      <bpmn:incoming>Flow_Mid_1</bpmn:incoming>
      <bpmn:outgoing>Flow_Mid_End</bpmn:outgoing>
    </bpmn:userTask>
    
    <!-- High Branch -->
    <bpmn:userTask id="Task_High_Ops" name="Head of Operations">
      <bpmn:documentation>{"assigneeType":"Designation","assigneeValue":"Head of Operations"}</bpmn:documentation>
      <bpmn:incoming>Flow_CS_High</bpmn:incoming>
      <bpmn:outgoing>Flow_High_1</bpmn:outgoing>
    </bpmn:userTask>
    <bpmn:userTask id="Task_High_CEO" name="CEO">
      <bpmn:documentation>{"assigneeType":"Designation","assigneeValue":"CEO"}</bpmn:documentation>
      <bpmn:incoming>Flow_High_1</bpmn:incoming>
      <bpmn:outgoing>Flow_High_2</bpmn:outgoing>
    </bpmn:userTask>
    <bpmn:userTask id="Task_High_EC" name="EC Committee">
      <bpmn:documentation>{"assigneeType":"Designation","assigneeValue":"EC Committee"}</bpmn:documentation>
      <bpmn:incoming>Flow_High_2</bpmn:incoming>
      <bpmn:outgoing>Flow_High_End</bpmn:outgoing>
    </bpmn:userTask>

    <bpmn:endEvent id="EndEvent_CS">
      <bpmn:incoming>Flow_Low_End</bpmn:incoming>
      <bpmn:incoming>Flow_Mid_End</bpmn:incoming>
      <bpmn:incoming>Flow_High_End</bpmn:incoming>
    </bpmn:endEvent>
    
    <bpmn:sequenceFlow id="Flow_CS1" sourceRef="StartEvent_CS" targetRef="Gateway_CS1" />
    
    <bpmn:sequenceFlow id="Flow_CS_Low" name="&#60;= 5000" sourceRef="Gateway_CS1" targetRef="Task_Low_Ops">
      <bpmn:conditionExpression xsi:type="bpmn:tFormalExpression">amount &lt;= 5000</bpmn:conditionExpression>
    </bpmn:sequenceFlow>
    <bpmn:sequenceFlow id="Flow_CS_Mid" name="5001-100000" sourceRef="Gateway_CS1" targetRef="Task_Mid_Ops">
      <bpmn:conditionExpression xsi:type="bpmn:tFormalExpression">amount &gt; 5000 &amp;&amp; amount &lt;= 100000</bpmn:conditionExpression>
    </bpmn:sequenceFlow>
    <bpmn:sequenceFlow id="Flow_CS_High" name="&#62; 100000" sourceRef="Gateway_CS1" targetRef="Task_High_Ops">
      <bpmn:conditionExpression xsi:type="bpmn:tFormalExpression">amount &gt; 100000</bpmn:conditionExpression>
    </bpmn:sequenceFlow>
    
    <bpmn:sequenceFlow id="Flow_Low_End" sourceRef="Task_Low_Ops" targetRef="EndEvent_CS" />
    <bpmn:sequenceFlow id="Flow_Mid_1" sourceRef="Task_Mid_Ops" targetRef="Task_Mid_CEO" />
    <bpmn:sequenceFlow id="Flow_Mid_End" sourceRef="Task_Mid_CEO" targetRef="EndEvent_CS" />
    
    <bpmn:sequenceFlow id="Flow_High_1" sourceRef="Task_High_Ops" targetRef="Task_High_CEO" />
    <bpmn:sequenceFlow id="Flow_High_2" sourceRef="Task_High_CEO" targetRef="Task_High_EC" />
    <bpmn:sequenceFlow id="Flow_High_End" sourceRef="Task_High_EC" targetRef="EndEvent_CS" />
  </bpmn:process>
  
  <bpmndi:BPMNDiagram id="BPMNDiagram_CS">
    <bpmndi:BPMNPlane id="BPMNPlane_CS" bpmnElement="Process_CS">
      <!-- Start Event -->
      <bpmndi:BPMNShape id="Shape_StartEvent_CS" bpmnElement="StartEvent_CS">
        <dc:Bounds x="100" y="200" width="36" height="36" />
      </bpmndi:BPMNShape>
      <!-- Gateway -->
      <bpmndi:BPMNShape id="Shape_Gateway_CS1" bpmnElement="Gateway_CS1">
        <dc:Bounds x="200" y="193" width="50" height="50" />
      </bpmndi:BPMNShape>
      
      <!-- Low Branch -->
      <bpmndi:BPMNShape id="Shape_Task_Low_Ops" bpmnElement="Task_Low_Ops">
        <dc:Bounds x="350" y="80" width="100" height="80" />
      </bpmndi:BPMNShape>
      
      <!-- Mid Branch -->
      <bpmndi:BPMNShape id="Shape_Task_Mid_Ops" bpmnElement="Task_Mid_Ops">
        <dc:Bounds x="350" y="180" width="100" height="80" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="Shape_Task_Mid_CEO" bpmnElement="Task_Mid_CEO">
        <dc:Bounds x="500" y="180" width="100" height="80" />
      </bpmndi:BPMNShape>
      
      <!-- High Branch -->
      <bpmndi:BPMNShape id="Shape_Task_High_Ops" bpmnElement="Task_High_Ops">
        <dc:Bounds x="350" y="280" width="100" height="80" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="Shape_Task_High_CEO" bpmnElement="Task_High_CEO">
        <dc:Bounds x="500" y="280" width="100" height="80" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="Shape_Task_High_EC" bpmnElement="Task_High_EC">
        <dc:Bounds x="650" y="280" width="100" height="80" />
      </bpmndi:BPMNShape>
      
      <!-- End Event -->
      <bpmndi:BPMNShape id="Shape_EndEvent_CS" bpmnElement="EndEvent_CS">
        <dc:Bounds x="850" y="200" width="36" height="36" />
      </bpmndi:BPMNShape>
      
      <!-- Edges -->
      <bpmndi:BPMNEdge id="Edge_Flow_CS1" bpmnElement="Flow_CS1">
        <di:waypoint x="136" y="218" />
        <di:waypoint x="200" y="218" />
      </bpmndi:BPMNEdge>
      
      <bpmndi:BPMNEdge id="Edge_Flow_CS_Low" bpmnElement="Flow_CS_Low">
        <di:waypoint x="225" y="193" />
        <di:waypoint x="225" y="120" />
        <di:waypoint x="350" y="120" />
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="Edge_Flow_CS_Mid" bpmnElement="Flow_CS_Mid">
        <di:waypoint x="250" y="218" />
        <di:waypoint x="350" y="220" />
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="Edge_Flow_CS_High" bpmnElement="Flow_CS_High">
        <di:waypoint x="225" y="243" />
        <di:waypoint x="225" y="320" />
        <di:waypoint x="350" y="320" />
      </bpmndi:BPMNEdge>
      
      <bpmndi:BPMNEdge id="Edge_Flow_Low_End" bpmnElement="Flow_Low_End">
        <di:waypoint x="450" y="120" />
        <di:waypoint x="868" y="120" />
        <di:waypoint x="868" y="200" />
      </bpmndi:BPMNEdge>
      
      <bpmndi:BPMNEdge id="Edge_Flow_Mid_1" bpmnElement="Flow_Mid_1">
        <di:waypoint x="450" y="220" />
        <di:waypoint x="500" y="220" />
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="Edge_Flow_Mid_End" bpmnElement="Flow_Mid_End">
        <di:waypoint x="600" y="220" />
        <di:waypoint x="850" y="218" />
      </bpmndi:BPMNEdge>
      
      <bpmndi:BPMNEdge id="Edge_Flow_High_1" bpmnElement="Flow_High_1">
        <di:waypoint x="450" y="320" />
        <di:waypoint x="500" y="320" />
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="Edge_Flow_High_2" bpmnElement="Flow_High_2">
        <di:waypoint x="600" y="320" />
        <di:waypoint x="650" y="320" />
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="Edge_Flow_High_End" bpmnElement="Flow_High_End">
        <di:waypoint x="750" y="320" />
        <di:waypoint x="868" y="320" />
        <di:waypoint x="868" y="236" />
      </bpmndi:BPMNEdge>
      
    </bpmndi:BPMNPlane>
  </bpmndi:BPMNDiagram>
</bpmn:definitions>`;

async function run() {
  try {
    const res = await pool.query('SELECT id FROM companies');
    for (const row of res.rows) {
      const companyId = row.id;
      console.log('Updating CS Evaluation Workflow with coordinates for company:', companyId);
      
      await pool.query('DELETE FROM bpmn_definitions WHERE "company_id" = $1 AND "document_type" = $2', [companyId, 'CS Evaluation']);
      
      await pool.query(
        'INSERT INTO bpmn_definitions ("name", "document_type", "department", "xml_data", "is_active", "company_id") VALUES ($1, $2, $3, $4, $5, $6)',
        ['CS Evaluation Approval Workflow', 'CS Evaluation', 'Global', csXml, true, companyId]
      );
    }
    console.log('Successfully saved proper UI layout to DB!');
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await pool.end();
  }
}
run();
