const assert = require('node:assert/strict');

const groupBaseUrl = process.env.GROUP_SERVICE_URL || 'http://localhost:3003';
const ticketBaseUrl = process.env.TICKET_SERVICE_URL || 'http://localhost:3002';

async function requestJson(url, init) {
  const headers = new Headers(init?.headers ?? undefined);

  if (init?.body !== undefined && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  if (!headers.has('Accept')) {
    headers.set('Accept', 'application/json');
  }

  const response = await fetch(url, {
    headers,
    ...init
  });

  const payload = await response.json();
  return { response, payload };
}

async function run() {
  const summary = [];

  const groupHealth = await requestJson(`${groupBaseUrl}/health`);
  assert.equal(groupHealth.response.status, 200);
  assert.equal(groupHealth.payload.intOpCode, 'GRP_HEALTH_OK');
  summary.push('group health ok');

  const ticketHealth = await requestJson(`${ticketBaseUrl}/health`);
  assert.equal(ticketHealth.response.status, 200);
  assert.equal(ticketHealth.payload.intOpCode, 'TKT_HEALTH_OK');
  summary.push('ticket health ok');

  const uniqueStamp = Date.now();
  const createdGroupName = `Grupo Integracion ${uniqueStamp}`;
  const createdTicketTitle = `Ticket Integracion ${uniqueStamp}`;

  const createdGroup = await requestJson(`${groupBaseUrl}/groups`, {
    method: 'POST',
    body: JSON.stringify({
      name: createdGroupName,
      description: 'Grupo temporal para tests de integracion',
      created_by: 1
    })
  });

  assert.equal(createdGroup.response.status, 201);
  assert.equal(createdGroup.payload.intOpCode, 'GRP_CREATE_SUCCESS');
  assert.ok(createdGroup.payload.data?.id);
  const groupId = createdGroup.payload.data.id;
  summary.push(`group created ${groupId}`);

  const fetchedGroup = await requestJson(`${groupBaseUrl}/groups/${groupId}`);
  assert.equal(fetchedGroup.response.status, 200);
  assert.equal(fetchedGroup.payload.data.name, createdGroupName);
  summary.push('group fetched ok');

  const updatedGroup = await requestJson(`${groupBaseUrl}/groups/${groupId}`, {
    method: 'PUT',
    body: JSON.stringify({ name: `${createdGroupName} actualizado` })
  });
  assert.equal(updatedGroup.response.status, 200);
  assert.equal(updatedGroup.payload.intOpCode, 'GRP_UPDATE_SUCCESS');
  summary.push('group updated ok');

  const membersResponse = await requestJson(`${groupBaseUrl}/groups/${groupId}/members`);
  assert.equal(membersResponse.response.status, 200);
  assert.equal(membersResponse.payload.intOpCode, 'GRP_GET_MEMBERS_SUCCESS');
  summary.push('group members ok');

  const addedMember = await requestJson(`${groupBaseUrl}/groups/${groupId}/members`, {
    method: 'POST',
    body: JSON.stringify({ email: 'nuevo@correo.com' })
  });
  assert.equal(addedMember.response.status, 201);
  assert.equal(addedMember.payload.intOpCode, 'GRP_ADD_MEMBER_SUCCESS');
  assert.equal(addedMember.payload.data.email, 'nuevo@correo.com');
  summary.push('group member added ok');

  const removedMember = await requestJson(`${groupBaseUrl}/groups/${groupId}/members/${encodeURIComponent('nuevo@correo.com')}`, {
    method: 'DELETE'
  });
  assert.equal(removedMember.response.status, 200);
  assert.equal(removedMember.payload.intOpCode, 'GRP_REMOVE_MEMBER_SUCCESS');
  summary.push('group member removed ok');

  const createdTicket = await requestJson(`${ticketBaseUrl}/tickets`, {
    method: 'POST',
    body: JSON.stringify({
      title: createdTicketTitle,
      description: 'Ticket temporal para tests de integracion',
      status: 'open',
      group_id: 1,
      assigned_to: 1,
      created_by: 1
    })
  });

  assert.equal(createdTicket.response.status, 201);
  assert.equal(createdTicket.payload.intOpCode, 'TKT_CREATE_SUCCESS');
  assert.ok(createdTicket.payload.data?.id);
  const ticketId = createdTicket.payload.data.id;
  summary.push(`ticket created ${ticketId}`);

  const fetchedTicket = await requestJson(`${ticketBaseUrl}/tickets/${ticketId}`);
  assert.equal(fetchedTicket.response.status, 200);
  assert.equal(fetchedTicket.payload.data.title, createdTicketTitle);
  summary.push('ticket fetched ok');

  const updatedTicket = await requestJson(`${ticketBaseUrl}/tickets/${ticketId}`, {
    method: 'PUT',
    body: JSON.stringify({
      title: `${createdTicketTitle} actualizado`,
      status: 'done'
    })
  });
  assert.equal(updatedTicket.response.status, 200);
  assert.equal(updatedTicket.payload.intOpCode, 'TKT_UPDATE_SUCCESS');
  summary.push('ticket updated ok');

  const deletedTicket = await requestJson(`${ticketBaseUrl}/tickets/${ticketId}`, {
    method: 'DELETE'
  });
  assert.equal(deletedTicket.response.status, 200);
  assert.equal(deletedTicket.payload.intOpCode, 'TKT_DELETE_SUCCESS');
  summary.push('ticket deleted ok');

  const deletedGroup = await requestJson(`${groupBaseUrl}/groups/${groupId}`, {
    method: 'DELETE'
  });
  assert.equal(deletedGroup.response.status, 200);
  assert.equal(deletedGroup.payload.intOpCode, 'GRP_DELETE_SUCCESS');
  summary.push('group deleted ok');

  console.log('Integration tests passed');
  summary.forEach((entry) => console.log(`- ${entry}`));
}

(async () => {
  try {
    await run();
  } catch (error) {
    console.error('Integration tests failed');
    console.error(error);
    process.exit(1);
  }
})();