export function buildGraphLayoutClusters(nodes, adjacencyMap, { focusedNoteId = "" } = {}) {
  if (focusedNoteId) return { anchorOrder: [], clusterAssignments: new Map(), clusterMembers: [] };
  const eligible = nodes.filter(node => !node.isGraphIsolatedCandidate && node.graphVisualState !== "isolated" &&
    (adjacencyMap.get(node.id)?.size || 0) > 0);
  const eligibleIds = new Set(eligible.map(node => node.id));
  const componentById = new Map();
  const components = [];
  for (const node of eligible) {
    if (componentById.has(node.id)) continue;
    const componentIndex = components.length;
    const queue = [node.id];
    componentById.set(node.id, componentIndex);
    for (let i = 0; i < queue.length; i += 1) {
      for (const neighborId of adjacencyMap.get(queue[i]) || []) {
        if (!eligibleIds.has(neighborId) || componentById.has(neighborId)) continue;
        componentById.set(neighborId, componentIndex);
        queue.push(neighborId);
      }
    }
    components.push(queue);
  }

  // Each real connected component gets its own anchor before any extra hubs.
  const anchorOrder = components.map(component => component[0]);
  const anchors = new Set(anchorOrder);
  const anchorCounts = components.map(() => 1);
  for (const node of eligible) {
    if (anchorOrder.length >= 4) break;
    const componentIndex = componentById.get(node.id);
    if (anchors.has(node.id) || adjacencyMap.get(node.id).size < 2 ||
        anchorCounts[componentIndex] >= Math.floor(components[componentIndex].length / 3)) continue;
    if ([...adjacencyMap.get(node.id)].some(id => anchors.has(id))) continue;
    anchors.add(node.id);
    anchorOrder.push(node.id);
    anchorCounts[componentIndex] += 1;
  }

  const clusterAssignments = new Map(anchorOrder.map((id, index) => [id, index]));
  const clusterMembers = anchorOrder.map(() => []);
  const queue = [...anchorOrder];
  // Multi-source traversal keeps every member connected to its own anchor.
  for (let i = 0; i < queue.length; i += 1) {
    const clusterIndex = clusterAssignments.get(queue[i]);
    for (const neighborId of adjacencyMap.get(queue[i]) || []) {
      if (!eligibleIds.has(neighborId) || clusterAssignments.has(neighborId)) continue;
      clusterAssignments.set(neighborId, clusterIndex);
      clusterMembers[clusterIndex].push(neighborId);
      queue.push(neighborId);
    }
  }
  return { anchorOrder, clusterAssignments, clusterMembers };
}
