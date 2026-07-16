require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const workflowXML = `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI" xmlns:dc="http://www.omg.org/spec/DD/20100524/DC" xmlns:di="http://www.omg.org/spec/DD/20100524/DI" id="Definitions_1" targetNamespace="http://bpmn.io/schema/bpmn">
  <bpmn:process id="Process_Custom_ABC" isExecutable="true">
    <bpmn:startEvent id="StartEvent_1">
      <bpmn:outgoing>Flow_1</bpmn:outgoing>
    </bpmn:startEvent>
    <bpmn:userTask id="Task_ABC_Review" name="ABC Review">
      <bpmn:incoming>Flow_1</bpmn:incoming>
      <bpmn:outgoing>Flow_2</bpmn:outgoing>
    </bpmn:userTask>
    <bpmn:endEvent id="EndEvent_1">
      <bpmn:incoming>Flow_2</bpmn:incoming>
    </bpmn:endEvent>
    <bpmn:sequenceFlow id="Flow_1" sourceRef="StartEvent_1" targetRef="Task_ABC_Review" />
    <bpmn:sequenceFlow id="Flow_2" sourceRef="Task_ABC_Review" targetRef="EndEvent_1" />
  </bpmn:process>
  <bpmndi:BPMNDiagram id="BPMNDiagram_1">
    <bpmndi:BPMNPlane id="BPMNPlane_1" bpmnElement="Process_Custom_ABC">
      <bpmndi:BPMNShape id="_BPMNShape_StartEvent_2" bpmnElement="StartEvent_1">
        <dc:Bounds x="156" y="82" width="36" height="36" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="Task_ABC_Review_di" bpmnElement="Task_ABC_Review">
        <dc:Bounds x="250" y="60" width="100" height="80" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="EndEvent_1_di" bpmnElement="EndEvent_1">
        <dc:Bounds x="410" y="82" width="36" height="36" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNEdge id="Flow_1_di" bpmnElement="Flow_1">
        <di:waypoint x="192" y="100" />
        <di:waypoint x="250" y="100" />
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="Flow_2_di" bpmnElement="Flow_2">
        <di:waypoint x="350" y="100" />
        <di:waypoint x="410" y="100" />
      </bpmndi:BPMNEdge>
    </bpmndi:BPMNPlane>
  </bpmndi:BPMNDiagram>
</bpmn:definitions>`;

(async () => {
  try {
    const abcCompanyId = 'a59e2cb5-d642-4edf-8c6a-b9d95ff765d0';
    
    // Fetch super admin UID
    const { rows: uRows } = await pool.query(`SELECT uid FROM users WHERE company_id = $1 LIMIT 1`, [abcCompanyId]);
    const adminUid = uRows.length > 0 ? uRows[0].uid : null;

    if (!adminUid) throw new Error('No admin user found for ABC Company.');

    // 1. Administration Data (5 each)
    await pool.query(`
      INSERT INTO departments (company_id, code, name, manager_uid, status) VALUES 
      ($1, 'D-MKT', 'Marketing', $2, 'Active'),
      ($1, 'D-SAL', 'Sales', $2, 'Active'),
      ($1, 'D-ENG', 'Engineering', $2, 'Active'),
      ($1, 'D-QA', 'Quality Assurance', $2, 'Active'),
      ($1, 'D-OPS', 'Operations', $2, 'Active')
      ON CONFLICT (code) DO NOTHING
    `, [abcCompanyId, adminUid]);

    await pool.query(`
      INSERT INTO designations (company_id, name, status) VALUES 
      ($1, 'Marketing Manager', 'Active'),
      ($1, 'Sales Executive', 'Active'),
      ($1, 'DevOps Engineer', 'Active'),
      ($1, 'QA Tester', 'Active'),
      ($1, 'Operations Analyst', 'Active')
      ON CONFLICT (name) DO NOTHING
    `, [abcCompanyId]);

    await pool.query(`
      INSERT INTO cost_centers (company_id, code, name) VALUES 
      ($1, 'CC-300', 'Marketing Budget'),
      ($1, 'CC-400', 'Sales Budget'),
      ($1, 'CC-500', 'Engineering Core'),
      ($1, 'CC-600', 'QA Operations'),
      ($1, 'CC-700', 'General Ops')
      ON CONFLICT (code) DO NOTHING
    `, [abcCompanyId]);

    // 2. Inventory Data (5 items)
    const { rows: invRows } = await pool.query(`
      INSERT INTO inventory_items (company_id, item_code, name, category, quantity_in_stock, uom, reorder_level) VALUES 
      ($1, 'OFC-001', 'A4 Printing Paper', 'Consumable', 100, 'Reams', 20),
      ($1, 'OFC-002', 'Whiteboard Markers', 'Consumable', 50, 'Pcs', 10),
      ($1, 'IT-006', 'Network Switch 24-port', 'IT Equipment', 5, 'Pcs', 1),
      ($1, 'IT-007', 'Cat6 Ethernet Cable', 'IT Equipment', 20, 'Rolls', 5),
      ($1, 'FUR-001', 'Ergonomic Chair', 'Fixed Asset', 15, 'Pcs', 2)
      RETURNING id, name
    `, [abcCompanyId]);

    // 3. Vendors (5 vendors)
    const { rows: vendorRows } = await pool.query(`
      INSERT INTO vendors (company_id, name, email, phone, status) VALUES 
      ($1, 'Global Paper Supplies', 'contact@gps.com', '123123123', 'Active'),
      ($1, 'Office Needs Ltd.', 'hello@officeneeds.com', '123123124', 'Active'),
      ($1, 'Networking Giants', 'sales@networkgiants.com', '123123125', 'Active'),
      ($1, 'Cable Corp', 'info@cablecorp.com', '123123126', 'Active'),
      ($1, 'Comfort Furniture', 'sales@comfortfurn.com', '123123127', 'Active')
      RETURNING id
    `, [abcCompanyId]);

    // 4. Procurement Data (5 PRs, POs, Invoices)
    for (let i = 0; i < 5; i++) {
      const vendorId = vendorRows[i].id;
      const item = invRows[i];

      // Insert PR
      const { rows: prRows } = await pool.query(`
        INSERT INTO purchase_requisitions (company_id, pr_number, requestor, uid, department, estimated_cost, status)
        VALUES ($1, 'PR-ABC-200' || $2, 'Admin', $3, 'Operations', 15000, 'Approved')
        RETURNING id
      `, [abcCompanyId, i+1, adminUid]);
      const prId = prRows[0].id;

      // Insert PR Item
      const { rows: prItemRows } = await pool.query(`
        INSERT INTO pr_items (pr_id, item_id, item_name, quantity, uom, estimated_price)
        VALUES ($1, $2, $3, 10, 'Units', 15000)
        RETURNING id
      `, [prId, item.id, item.name]);

      // Insert PO
      const { rows: poRows } = await pool.query(`
        INSERT INTO purchase_orders (company_id, po_number, pr_id, vendor_id, total_amount, status)
        VALUES ($1, 'PO-ABC-200' || $2, $3, $4, 14500, 'Approved')
        RETURNING id
      `, [abcCompanyId, i+1, prId, vendorId]);
      const poId = poRows[0].id;

      // Insert PO Item
      await pool.query(`
        INSERT INTO po_items (po_id, item_name, quantity, uom, unit_price)
        VALUES ($1, $2, 10, 'Units', 1450)
      `, [poId, item.name]);

      // Insert GRN
      const { rows: grnRows } = await pool.query(`
        INSERT INTO grn (company_id, grn_number, po_id, received_by, status)
        VALUES ($1, 'GRN-ABC-200' || $2, $3, $4, 'QC Completed')
        RETURNING id
      `, [abcCompanyId, i+1, poId, adminUid]);

      // Insert Invoice
      await pool.query(`
        INSERT INTO invoices (invoice_number, po_id, grn_id, amount, status)
        VALUES ('INV-ABC-200' || $1, $2, $3, 14500, 'Approved')
      `, [i+1, poId, grnRows[0].id]);
    }

    // 5. BPMN Workflow XML
    await pool.query(`
      INSERT INTO bpmn_definitions (company_id, document_type, department, name, xml_data, is_active)
      VALUES ($1, 'PR', 'Global', 'Custom ABC Workflow', $2, true)
    `, [abcCompanyId, workflowXML]);

    console.log('✅ Inserted 5 more records per menu and saved a new editable workflow XML.');
  } catch (err) {
    console.error('Error inserting extra data:', err);
  } finally {
    pool.end();
  }
})();
