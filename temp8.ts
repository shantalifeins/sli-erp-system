import * as dotenv from 'dotenv';
dotenv.config();
import { db } from './src/shared/db/index';
import { bpmn_definitions, companies } from './src/shared/db/schema';
import { eq } from 'drizzle-orm';

async function run() {
  const c = await db.select().from(companies).limit(1);
  if (!c[0]) return;
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" id="Definitions_CS" targetNamespace="http://bpmn.io/schema/bpmn">
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
    
    <bpmn:sequenceFlow id="Flow_CS_Low" name="amount &lt;= 5000" sourceRef="Gateway_CS1" targetRef="Task_Low_Ops">
      <bpmn:conditionExpression xsi:type="bpmn:tFormalExpression">amount &lt;= 5000</bpmn:conditionExpression>
    </bpmn:sequenceFlow>
    <bpmn:sequenceFlow id="Flow_CS_Mid" name="amount &gt; 5000 &amp;&amp; amount &lt;= 100000" sourceRef="Gateway_CS1" targetRef="Task_Mid_Ops">
      <bpmn:conditionExpression xsi:type="bpmn:tFormalExpression">amount &gt; 5000 &amp;&amp; amount &lt;= 100000</bpmn:conditionExpression>
    </bpmn:sequenceFlow>
    <bpmn:sequenceFlow id="Flow_CS_High" name="amount &gt; 100000" sourceRef="Gateway_CS1" targetRef="Task_High_Ops">
      <bpmn:conditionExpression xsi:type="bpmn:tFormalExpression">amount &gt; 100000</bpmn:conditionExpression>
    </bpmn:sequenceFlow>
    
    <bpmn:sequenceFlow id="Flow_Low_End" sourceRef="Task_Low_Ops" targetRef="EndEvent_CS" />
    <bpmn:sequenceFlow id="Flow_Mid_1" sourceRef="Task_Mid_Ops" targetRef="Task_Mid_CEO" />
    <bpmn:sequenceFlow id="Flow_Mid_End" sourceRef="Task_Mid_CEO" targetRef="EndEvent_CS" />
    
    <bpmn:sequenceFlow id="Flow_High_1" sourceRef="Task_High_Ops" targetRef="Task_High_CEO" />
    <bpmn:sequenceFlow id="Flow_High_2" sourceRef="Task_High_CEO" targetRef="Task_High_EC" />
    <bpmn:sequenceFlow id="Flow_High_End" sourceRef="Task_High_EC" targetRef="EndEvent_CS" />
  </bpmn:process>
</bpmn:definitions>`;

  await db.update(bpmn_definitions).set({
    xmlData: xml,
  }).where(eq(bpmn_definitions.documentType, 'CS Evaluation'));
  console.log('Saved successfully');
  process.exit(0);
}

run().catch(console.error);
