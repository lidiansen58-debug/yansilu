import {
  graphClusterAnchorAngles
} from "./graph-visual-map-view.js";

export function graphBuildVisualLayout(nodes = [], edges = [], options = {}, deps = {}) {
  const {
    graphHash = () => 0,
    graphNodeStarTier = () => "minor",
    graphNodeRadiusByTier = () => 4
  } = deps || {};
  const focusedNoteId = String(options.focusedNoteId || "").trim();
  const nodeMap = new Map();
  const adjacencyMap = new Map();

  nodes.forEach((node) => {
    const id = String(node?.id || "").trim();
    if (!id) return;
    nodeMap.set(id, {
      ...node,
      id,
      title: String(node?.title || id).trim() || id,
      noteType: String(node?.noteType || node?.note_type || "note").trim() || "note",
      degree: 0,
      inDegree: 0,
      outDegree: 0
    });
  });

  edges.forEach((edge) => {
    const fromId = String(edge?.fromNoteId || "").trim();
    const toId = String(edge?.toNoteId || "").trim();
    if (fromId && !nodeMap.has(fromId)) {
      nodeMap.set(fromId, {
        id: fromId,
        title: String(edge?.fromTitle || fromId).trim() || fromId,
        noteType: "note",
        degree: 0,
        inDegree: 0,
        outDegree: 0
      });
    }
    if (toId && !nodeMap.has(toId)) {
      nodeMap.set(toId, {
        id: toId,
        title: String(edge?.toTitle || toId).trim() || toId,
        noteType: "note",
        degree: 0,
        inDegree: 0,
        outDegree: 0
      });
    }
    const from = nodeMap.get(fromId);
    const to = nodeMap.get(toId);
    if (from) {
      from.degree += 1;
      from.outDegree += 1;
    }
    if (to) {
      to.degree += 1;
      to.inDegree += 1;
    }
    if (fromId && toId && fromId !== toId) {
      if (!adjacencyMap.has(fromId)) adjacencyMap.set(fromId, new Set());
      if (!adjacencyMap.has(toId)) adjacencyMap.set(toId, new Set());
      adjacencyMap.get(fromId).add(toId);
      adjacencyMap.get(toId).add(fromId);
    }
  });

  const nodeTotal = nodeMap.size;
  const width = nodeTotal > 48 ? 1560 : nodeTotal > 28 ? 1320 : 1080;
  const height = nodeTotal > 48 ? 820 : nodeTotal > 28 ? 700 : 560;
  const centerX = width / 2;
  const centerY = height / 2;
  const layoutNodes = [...nodeMap.values()].sort(
    (a, b) => b.degree - a.degree || String(a.title).localeCompare(String(b.title), "zh-Hans-CN") || a.id.localeCompare(b.id)
  );
  if (focusedNoteId) {
    const focusedIndex = layoutNodes.findIndex((node) => node.id === focusedNoteId);
    if (focusedIndex > 0) {
      const [focusedNode] = layoutNodes.splice(focusedIndex, 1);
      layoutNodes.unshift(focusedNode);
    }
  }
  const outerCount = Math.max(0, layoutNodes.length - 1);
  const innerCount = outerCount > 12 ? Math.ceil(outerCount * 0.58) : outerCount;
  const outerRingCount = Math.max(1, outerCount - innerCount);
  const anchorCount = focusedNoteId ? 1 : Math.min(4, layoutNodes.filter((node) => Number(node.degree || 0) > 0).length);
  const anchorIds = new Set(layoutNodes.slice(0, anchorCount).map((node) => node.id));
  const anchorOrder = [...anchorIds];
  const anchorAngles = graphClusterAnchorAngles(anchorOrder.length || anchorCount || 1);
  const clusterCenters = anchorOrder.map((anchorId, anchorIndex) => {
    const angle = anchorAngles[anchorIndex] ?? (-Math.PI / 2 + (Math.PI * 2 * anchorIndex) / Math.max(1, anchorOrder.length || 1));
    const radialScaleX = width * (anchorOrder.length > 2 ? 0.22 + (anchorIndex % 2) * 0.02 : 0.21);
    const radialScaleY = height * (anchorOrder.length > 2 ? 0.17 + ((anchorIndex + 1) % 2) * 0.024 : 0.165);
    return {
      angle,
      x: Math.round(centerX + Math.cos(angle) * radialScaleX),
      y: Math.round(centerY + Math.sin(angle) * radialScaleY)
    };
  });
  const clusterAssignments = new Map();
  const clusterMembers = Array.from({ length: Math.max(1, anchorOrder.length || 3) }, () => []);
  const clusterMemberOrder = new Map();
  const isolatedLayoutNodes = layoutNodes.filter((node) => node.isGraphIsolatedCandidate || node.graphVisualState === "isolated");
  const isolatedIndexById = new Map(isolatedLayoutNodes.map((node, index) => [node.id, index]));

  if (!focusedNoteId && anchorOrder.length) {
    const eligibleIds = new Set(
      layoutNodes
        .filter((node, index) => index && !anchorIds.has(node.id) && !node.isGraphIsolatedCandidate && node.graphVisualState !== "isolated")
        .map((node) => node.id)
    );
    eligibleIds.forEach((nodeId) => {
      const rankedAnchors = anchorOrder.map((anchorId, anchorIndex) => ({
        anchorIndex,
        score: adjacencyMap.get(nodeId)?.has(anchorId) ? 1 : 0,
        load: clusterMembers[anchorIndex]?.length || 0
      }));
      const connectedAnchors = rankedAnchors.filter((item) => item.score > 0);
      if (!connectedAnchors.length) return;
      const clusterIndex = connectedAnchors.sort((a, b) => b.score - a.score || a.load - b.load || a.anchorIndex - b.anchorIndex)[0].anchorIndex;
      clusterAssignments.set(nodeId, clusterIndex);
      clusterMembers[clusterIndex].push(nodeId);
    });
    let assignedInPass = true;
    while (assignedInPass) {
      assignedInPass = false;
      eligibleIds.forEach((nodeId) => {
        if (clusterAssignments.has(nodeId)) return;
        const neighborScores = new Map();
        (adjacencyMap.get(nodeId) || new Set()).forEach((neighborId) => {
          if (!clusterAssignments.has(neighborId)) return;
          const clusterIndex = clusterAssignments.get(neighborId);
          neighborScores.set(clusterIndex, (neighborScores.get(clusterIndex) || 0) + 1);
        });
        if (!neighborScores.size) return;
        const rankedClusters = [...neighborScores.entries()].map(([anchorIndex, score]) => ({
          anchorIndex,
          score,
          load: clusterMembers[anchorIndex]?.length || 0
        }));
        const clusterIndex = rankedClusters.sort((a, b) => b.score - a.score || a.load - b.load || a.anchorIndex - b.anchorIndex)[0].anchorIndex;
        clusterAssignments.set(nodeId, clusterIndex);
        clusterMembers[clusterIndex].push(nodeId);
        assignedInPass = true;
      });
    }
    const visited = new Set();
    eligibleIds.forEach((nodeId) => {
      if (clusterAssignments.has(nodeId) || visited.has(nodeId)) return;
      const component = [];
      const queue = [nodeId];
      visited.add(nodeId);
      while (queue.length) {
        const currentId = queue.shift();
        component.push(currentId);
        (adjacencyMap.get(currentId) || new Set()).forEach((neighborId) => {
          if (!eligibleIds.has(neighborId) || clusterAssignments.has(neighborId) || visited.has(neighborId)) return;
          visited.add(neighborId);
          queue.push(neighborId);
        });
      }
      const rankedAnchors = anchorOrder.map((anchorId, anchorIndex) => ({
        anchorIndex,
        load: clusterMembers[anchorIndex]?.length || 0
      }));
      const clusterIndex = rankedAnchors.sort((a, b) => a.load - b.load || a.anchorIndex - b.anchorIndex)[graphHash(component[0] || nodeId) % rankedAnchors.length].anchorIndex;
      component.forEach((componentId) => {
        clusterAssignments.set(componentId, clusterIndex);
        clusterMembers[clusterIndex].push(componentId);
      });
    });
  }

  clusterMembers.forEach((memberIds, clusterIndex) => {
    const orderedMembers = [...new Set(memberIds)].sort((leftId, rightId) => {
      const leftNode = nodeMap.get(leftId) || {};
      const rightNode = nodeMap.get(rightId) || {};
      const leftDegree = Number(leftNode.degree || 0);
      const rightDegree = Number(rightNode.degree || 0);
      return (
        rightDegree - leftDegree ||
        graphHash(`${leftId}:cluster:${clusterIndex}`) - graphHash(`${rightId}:cluster:${clusterIndex}`) ||
        String(leftNode.title || leftId).localeCompare(String(rightNode.title || rightId), "zh-Hans-CN") ||
        String(leftId).localeCompare(String(rightId))
      );
    });
    clusterMembers[clusterIndex] = orderedMembers;
    orderedMembers.forEach((memberId, memberIndex) => {
      clusterMemberOrder.set(memberId, memberIndex);
    });
  });

  layoutNodes.forEach((node, index) => {
    const isFocused = Boolean(focusedNoteId) && node.id === focusedNoteId;
    const isVisualIsolated = Boolean(node.isGraphIsolatedCandidate || node.graphVisualState === "isolated");
    const isHub = (index === 0 && node.degree > 0) || isFocused;
    const isAnchor = !focusedNoteId && anchorIds.has(node.id);
    node.isHub = isHub;
    node.isFocused = isFocused;
    node.isContext = Boolean(focusedNoteId) && !isFocused;
    node.isAnchor = isAnchor;
    node.isGraphIsolatedCandidate = isVisualIsolated;
    node.starTier = graphNodeStarTier(node);
    node.radius = graphNodeRadiusByTier(node.starTier, node.degree);
    node.clusterArmDepth = 0;
    node.clusterIndex = !focusedNoteId && !isVisualIsolated ? clusterAssignments.get(node.id) ?? (node.isAnchor ? anchorOrder.indexOf(node.id) : -1) : -1;
    node.auraRadius =
      node.starTier === "focus"
        ? node.radius + 10
        : node.starTier === "core"
          ? node.radius + 7
          : node.starTier === "major"
            ? node.radius + 4
            : node.starTier === "isolated"
              ? node.radius + 3
              : 0;

    if (isVisualIsolated && outerCount) {
      const isolatedIndex = isolatedIndexById.get(node.id) || 0;
      const isolatedTotal = Math.max(1, isolatedLayoutNodes.length);
      const angle = -Math.PI / 2 + (Math.PI * 2 * isolatedIndex) / isolatedTotal + ((graphHash(node.id) % 13) - 6) * 0.018;
      const isolatedRadiusX = width * (nodeTotal > 28 ? 0.45 : 0.39);
      const isolatedRadiusY = height * (nodeTotal > 28 ? 0.36 : 0.33);
      node.x = Math.round(centerX + Math.cos(angle) * isolatedRadiusX);
      node.y = Math.round(centerY + Math.sin(angle) * isolatedRadiusY);
      return;
    }

    if (!outerCount || isHub) {
      node.x = centerX;
      node.y = centerY;
      return;
    }

    const ringIndex = index - 1;
    const anchorIndex = !focusedNoteId ? anchorOrder.indexOf(node.id) : -1;
    if (anchorIndex >= 0) {
      const clusterCenter = clusterCenters[anchorIndex] || { x: centerX, y: centerY };
      node.x = clusterCenter.x;
      node.y = clusterCenter.y;
      return;
    }

    if (!focusedNoteId && anchorOrder.length) {
      const clusterIndex = clusterAssignments.get(node.id);
      if (Number.isInteger(clusterIndex) && clusterIndex >= 0) {
        const memberIds = clusterMembers[clusterIndex] || [];
        const localIndex = Math.max(0, clusterMemberOrder.get(node.id) ?? memberIds.indexOf(node.id));
        const memberCount = Math.max(1, memberIds.length);
        const clusterProgress = memberCount <= 1 ? 0 : localIndex / Math.max(1, memberCount - 1);
        const clusterCenter = clusterCenters[clusterIndex] || { x: centerX, y: centerY, angle: anchorAngles[clusterIndex] || -Math.PI / 2 };
        const anchorAngle = clusterCenter.angle ?? (anchorAngles[clusterIndex] ?? (-Math.PI / 2 + (Math.PI * 2 * clusterIndex) / Math.max(1, anchorOrder.length)));
        const tierWeight =
          node.starTier === "major"
            ? 0
            : node.starTier === "medium"
              ? 1
              : node.starTier === "minor"
                ? 2
                : 3;
        const armDirection = clusterIndex % 2 === 0 ? 1 : -1;
        const jitter = ((graphHash(node.id) % 11) - 5) * 1.4;
        const nucleusCount = Math.min(memberCount > 12 ? 4 : 3, Math.max(1, Math.ceil(memberCount * 0.16)));
        if (localIndex < nucleusCount) {
          const nucleusAngle = anchorAngle + armDirection * 0.36 + (Math.PI * 2 * localIndex) / Math.max(1, nucleusCount) + jitter * 0.012;
          const nucleusRadius = 16 + tierWeight * 3.8 + localIndex * 2.4 + Math.max(0, node.radius - 3) * 1.2;
          node.clusterArmDepth = Math.min(0.16, 0.06 + localIndex * 0.04);
          node.x = Math.round(clusterCenter.x + Math.cos(nucleusAngle) * nucleusRadius * 1.04);
          node.y = Math.round(clusterCenter.y + Math.sin(nucleusAngle) * nucleusRadius * 0.82);
          node.x = Math.max(28, Math.min(width - 28, node.x));
          node.y = Math.max(28, Math.min(height - 28, node.y));
          return;
        }
        const outerIndex = Math.max(0, localIndex - nucleusCount);
        const armCount = memberCount > 16 ? 3 : memberCount > 8 ? 2 : 1;
        const armIndex = outerIndex % armCount;
        const armSlot = Math.floor(outerIndex / Math.max(1, armCount));
        const armSpan = Math.max(1, Math.ceil((memberCount - nucleusCount) / Math.max(1, armCount)));
        const armDepth = armSpan <= 1 ? clusterProgress : armSlot / Math.max(1, armSpan - 1);
        node.clusterArmDepth = armDepth;
        const armOffset = (armIndex - (armCount - 1) / 2) * 0.34;
        const spiralTurn = 0.42 + armDepth * 1.9 + armOffset;
        const spiralAngle = anchorAngle + armDirection * spiralTurn;
        const radialDistance =
          28 +
          tierWeight * 8 +
          armDepth * Math.min(148, 68 + memberCount * 3.4) +
          Math.pow(armDepth, 1.45) * 32 +
          armIndex * 5 +
          Math.max(0, node.radius - 3) * 1.4;
        const tangentAngle = spiralAngle + Math.PI / 2;
        const laneSpread = armOffset * (26 + armDepth * 24) + jitter * (0.82 + armDepth * 0.4);
        const radialX = Math.cos(spiralAngle) * radialDistance;
        const radialY = Math.sin(spiralAngle) * radialDistance * 0.8;
        const tangentX = Math.cos(tangentAngle) * laneSpread;
        const tangentY = Math.sin(tangentAngle) * laneSpread * 0.78;
        node.x = Math.round(clusterCenter.x + radialX + tangentX);
        node.y = Math.round(clusterCenter.y + radialY + tangentY);
        node.x = Math.max(28, Math.min(width - 28, node.x));
        node.y = Math.max(28, Math.min(height - 28, node.y));
        return;
      }
    }

    const useOuterRing = outerCount > 12 && ringIndex >= innerCount;
    const ringPosition = useOuterRing ? ringIndex - innerCount : ringIndex;
    const ringTotal = useOuterRing ? outerRingCount : Math.max(1, innerCount);
    const angle = -Math.PI / 2 + (Math.PI * 2 * ringPosition) / ringTotal;
    const jitter = graphHash(node.id) % 17;
    const radiusX = useOuterRing ? width * 0.42 : outerCount > 7 ? width * 0.29 : width * 0.26;
    const radiusY = useOuterRing ? height * 0.34 : outerCount > 7 ? height * 0.25 : height * 0.3;
    node.x = Math.round(centerX + Math.cos(angle) * (radiusX + jitter * 0.6));
    node.y = Math.round(centerY + Math.sin(angle) * (radiusY + jitter * 0.35));
  });

  const clusterMeta = !focusedNoteId
    ? clusterMembers
        .flatMap((memberIds, clusterIndex) => {
          const anchorId = anchorOrder[clusterIndex] || "";
          const clusterMemberIds = [...new Set([anchorId, ...memberIds].filter(Boolean))];
          const members = memberIds
            .map((memberId) => layoutNodes.find((node) => node.id === memberId))
            .filter(Boolean);
          if (!members.length) return [];
          const anchorNode = anchorId ? nodeMap.get(anchorId) : null;
          const minX = Math.min(...members.map((node) => Number(node.x || 0)));
          const maxX = Math.max(...members.map((node) => Number(node.x || 0)));
          const minY = Math.min(...members.map((node) => Number(node.y || 0)));
          const maxY = Math.max(...members.map((node) => Number(node.y || 0)));
          const clusterCenter = clusterCenters[clusterIndex] || {
            x: Math.round((minX + maxX) / 2),
            y: Math.round((minY + maxY) / 2),
            angle: anchorAngles[clusterIndex] || 0
          };
          const cx = clusterCenter.x;
          const cy = clusterCenter.y;
          const rx = Math.max(56, Math.round((maxX - minX) * 0.62 + 54));
          const ry = Math.max(44, Math.round((maxY - minY) * 0.66 + 38));
          const tone = ["teal", "sky", "bridge", "mist"][clusterIndex % 4];
          const rotation = Math.round((((clusterCenter.angle || 0) * 180) / Math.PI) + 90);
          const baseMeta = {
            clusterKey: `cluster-${clusterIndex}`,
            clusterIndex,
            title: String(anchorNode?.title || members[0]?.title || `星系 ${clusterIndex + 1}`).trim() || `星系 ${clusterIndex + 1}`,
            anchorId,
            memberIds: clusterMemberIds
          };
          return [
            {
              ...baseMeta,
              cx,
              cy,
              rx,
              ry,
              rotation,
              tone,
              opacity: Math.max(0.12, 0.18 - clusterIndex * 0.012)
            },
            {
              ...baseMeta,
              cx: Math.round(cx + Math.cos(clusterCenter.angle || 0) * 6),
              cy: Math.round(cy + Math.sin(clusterCenter.angle || 0) * 5),
              rx: Math.max(28, Math.round(rx * 0.3)),
              ry: Math.max(22, Math.round(ry * 0.28)),
              rotation,
              tone,
              opacity: Math.max(0.22, 0.32 - clusterIndex * 0.01)
            }
          ];
        })
        .filter(Boolean)
    : [];

  return { width, height, nodes: layoutNodes, nodeMap, clusterMeta };
}
