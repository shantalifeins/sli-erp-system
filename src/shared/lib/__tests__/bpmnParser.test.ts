import { describe, it, expect } from 'vitest';
import { evaluateWorkflowPath } from '../bpmnParser';

describe('bpmnParser - evaluateWorkflowPath', () => {
  it('should return an empty array for invalid XML', () => {
    const result = evaluateWorkflowPath('invalid xml');
    expect(result).toEqual([]);
  });

  it('should parse a linear sequence of tasks', () => {
    const xml = `
      <?xml version="1.0" encoding="UTF-8"?>
      <bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" id="Definitions_1">
        <bpmn:process id="Process_1" isExecutable="true">
          <bpmn:startEvent id="StartEvent_1">
            <bpmn:outgoing>Flow_1</bpmn:outgoing>
          </bpmn:startEvent>
          <bpmn:userTask id="Task_1" name="First Task">
            <bpmn:incoming>Flow_1</bpmn:incoming>
            <bpmn:outgoing>Flow_2</bpmn:outgoing>
          </bpmn:userTask>
          <bpmn:userTask id="Task_2" name="Second Task">
            <bpmn:incoming>Flow_2</bpmn:incoming>
            <bpmn:outgoing>Flow_3</bpmn:outgoing>
          </bpmn:userTask>
          <bpmn:endEvent id="EndEvent_1">
            <bpmn:incoming>Flow_3</bpmn:incoming>
          </bpmn:endEvent>
          <bpmn:sequenceFlow id="Flow_1" sourceRef="StartEvent_1" targetRef="Task_1" />
          <bpmn:sequenceFlow id="Flow_2" sourceRef="Task_1" targetRef="Task_2" />
          <bpmn:sequenceFlow id="Flow_3" sourceRef="Task_2" targetRef="EndEvent_1" />
        </bpmn:process>
      </bpmn:definitions>
    `;

    const result = evaluateWorkflowPath(xml);
    expect(result.length).toBe(2);
    expect(result[0].name).toBe('First Task');
    expect(result[1].name).toBe('Second Task');
  });

  it('should evaluate exclusive gateways based on context', () => {
    const xml = `
      <?xml version="1.0" encoding="UTF-8"?>
      <bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL">
        <bpmn:process id="Process_1" isExecutable="true">
          <bpmn:startEvent id="StartEvent_1">
            <bpmn:outgoing>Flow_1</bpmn:outgoing>
          </bpmn:startEvent>
          <bpmn:exclusiveGateway id="Gateway_1" default="Flow_Default">
            <bpmn:incoming>Flow_1</bpmn:incoming>
            <bpmn:outgoing>Flow_High</bpmn:outgoing>
            <bpmn:outgoing>Flow_Default</bpmn:outgoing>
          </bpmn:exclusiveGateway>
          <bpmn:userTask id="Task_High" name="High Amount Approval">
            <bpmn:incoming>Flow_High</bpmn:incoming>
          </bpmn:userTask>
          <bpmn:userTask id="Task_Low" name="Low Amount Approval">
            <bpmn:incoming>Flow_Default</bpmn:incoming>
          </bpmn:userTask>
          <bpmn:sequenceFlow id="Flow_1" sourceRef="StartEvent_1" targetRef="Gateway_1" />
          <bpmn:sequenceFlow id="Flow_High" sourceRef="Gateway_1" targetRef="Task_High">
            <bpmn:conditionExpression>amount > 1000</bpmn:conditionExpression>
          </bpmn:sequenceFlow>
          <bpmn:sequenceFlow id="Flow_Default" sourceRef="Gateway_1" targetRef="Task_Low" />
        </bpmn:process>
      </bpmn:definitions>
    `;

    // Test High Amount
    const highResult = evaluateWorkflowPath(xml, { amount: 1500 });
    expect(highResult.length).toBe(1);
    expect(highResult[0].name).toBe('High Amount Approval');

    // Test Low Amount (should fallback to default)
    const lowResult = evaluateWorkflowPath(xml, { amount: 500 });
    expect(lowResult.length).toBe(1);
    expect(lowResult[0].name).toBe('Low Amount Approval');
  });

  it('should parse custom assignee config from documentation', () => {
    const xml = `
      <bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL">
        <bpmn:process id="Process_1">
          <bpmn:startEvent id="StartEvent_1" />
          <bpmn:userTask id="Task_1" name="CEO Approval">
            <bpmn:documentation>{"assigneeType": "Designation", "assigneeValue": "CEO"}</bpmn:documentation>
          </bpmn:userTask>
          <bpmn:sequenceFlow id="Flow_1" sourceRef="StartEvent_1" targetRef="Task_1" />
        </bpmn:process>
      </bpmn:definitions>
    `;
    const result = evaluateWorkflowPath(xml);
    expect(result.length).toBe(1);
    expect(result[0].assigneeType).toBe('Designation');
    expect(result[0].assigneeValue).toBe('CEO');
  });
});
