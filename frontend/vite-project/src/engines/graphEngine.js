export function generateGraphSteps(algorithmKey, numNodes = 7, customEdges = null, startNode = 0, targetNode = 6) {
  const steps = [];

  const edges = customEdges || [
    { from: 0, to: 1, weight: 4 },
    { from: 0, to: 2, weight: 2 },
    { from: 1, to: 2, weight: 1 },
    { from: 1, to: 3, weight: 5 },
    { from: 2, to: 3, weight: 8 },
    { from: 2, to: 4, weight: 10 },
    { from: 3, to: 4, weight: 2 },
    { from: 3, to: 5, weight: 6 },
    { from: 4, to: 6, weight: 3 },
    { from: 5, to: 6, weight: 1 }
  ];

  const adj = Array.from({ length: numNodes }, () => []);
  edges.forEach(e => {
    adj[e.from].push({ to: e.to, weight: e.weight });
    adj[e.to].push({ to: e.from, weight: e.weight });
  });

  if (algorithmKey === 'dijkstra') {
    const dist = Array(numNodes).fill(Infinity);
    const parent = Array(numNodes).fill(-1);
    const visited = Array(numNodes).fill(false);
    dist[startNode] = 0;

    const visitedList = [];
    const distMap = { [startNode]: 0 };

    steps.push({
      type: 'visit',
      currentNode: startNode,
      visitedNodes: [startNode],
      distances: { ...distMap },
      lineHighlight: 5,
      description: `Initialized distance to start node ${startNode} = 0`
    });

    const pq = [{ node: startNode, dist: 0 }];

    while (pq.length > 0) {
      pq.sort((a, b) => a.dist - b.dist);
      const { node: u, dist: d } = pq.shift();

      if (visited[u]) continue;
      visited[u] = true;
      visitedList.push(u);

      steps.push({
        type: 'visit',
        currentNode: u,
        visitedNodes: [...visitedList],
        distances: { ...distMap },
        lineHighlight: 10,
        description: `Extracted node ${u} with minimum distance ${d}`
      });

      if (u === targetNode) {
        const path = [];
        for (let curr = targetNode; curr !== -1; curr = parent[curr]) path.push(curr);
        path.reverse();

        steps.push({
          type: 'path_found',
          currentNode: targetNode,
          visitedNodes: [...visitedList],
          pathNodes: path,
          distances: { ...distMap },
          lineHighlight: 16,
          description: `Target node ${targetNode} reached! Shortest path: [${path.join(' -> ')}] with total distance ${dist[targetNode]}`
        });
        return { steps, edges };
      }

      for (let edge of adj[u]) {
        const { to: v, weight: w } = edge;
        if (!visited[v] && dist[u] + w < dist[v]) {
          dist[v] = dist[u] + w;
          parent[v] = u;
          distMap[v] = dist[v];
          pq.push({ node: v, dist: dist[v] });
          steps.push({
            type: 'update_distance',
            currentNode: u,
            edgeTarget: v,
            visitedNodes: [...visitedList],
            distances: { ...distMap },
            lineHighlight: 18,
            description: `Relaxing edge (${u} -> ${v}, w=${w}). Updated dist[${v}] = ${dist[v]}`
          });
        }
      }
    }
  } else if (algorithmKey === 'bfs') {
    const visited = Array(numNodes).fill(false);
    const parent = Array(numNodes).fill(-1);
    const q = [startNode];
    visited[startNode] = true;
    const visitedList = [startNode];

    steps.push({
      type: 'visit',
      currentNode: startNode,
      visitedNodes: [...visitedList],
      distances: { [startNode]: 0 },
      lineHighlight: 4,
      description: `Starting BFS from node ${startNode}`
    });

    while (q.length > 0) {
      const u = q.shift();

      if (u === targetNode) {
        const path = [];
        for (let curr = targetNode; curr !== -1; curr = parent[curr]) path.push(curr);
        path.reverse();
        steps.push({
          type: 'path_found',
          currentNode: targetNode,
          visitedNodes: [...visitedList],
          pathNodes: path,
          distances: {},
          lineHighlight: 12,
          description: `Target node ${targetNode} found via BFS path: [${path.join(' -> ')}]`
        });
        return { steps, edges };
      }

      for (let edge of adj[u]) {
        const v = edge.to;
        if (!visited[v]) {
          visited[v] = true;
          parent[v] = u;
          visitedList.push(v);
          q.push(v);
          steps.push({
            type: 'explore_edge',
            currentNode: u,
            edgeTarget: v,
            visitedNodes: [...visitedList],
            distances: {},
            lineHighlight: 14,
            description: `BFS traversing edge (${u} -> ${v}), enqueued node ${v}`
          });
        }
      }
    }
  } else if (algorithmKey === 'dfs') {
    const visited = Array(numNodes).fill(false);
    const parent = Array(numNodes).fill(-1);
    const visitedList = [];

    function dfsRec(u) {
      visited[u] = true;
      visitedList.push(u);
      steps.push({
        type: 'visit',
        currentNode: u,
        visitedNodes: [...visitedList],
        distances: {},
        lineHighlight: 3,
        description: `DFS visited node ${u}`
      });

      if (u === targetNode) return true;

      for (let edge of adj[u]) {
        const v = edge.to;
        if (!visited[v]) {
          parent[v] = u;
          steps.push({
            type: 'explore_edge',
            currentNode: u,
            edgeTarget: v,
            visitedNodes: [...visitedList],
            distances: {},
            lineHighlight: 6,
            description: `DFS exploring edge (${u} -> ${v})`
          });
          if (dfsRec(v)) return true;
        }
      }
      return false;
    }

    if (dfsRec(startNode)) {
      const path = [];
      for (let curr = targetNode; curr !== -1; curr = parent[curr]) path.push(curr);
      path.reverse();
      steps.push({
        type: 'path_found',
        currentNode: targetNode,
        visitedNodes: [...visitedList],
        pathNodes: path,
        distances: {},
        lineHighlight: 10,
        description: `DFS target ${targetNode} found path: [${path.join(' -> ')}]`
      });
    }
  }

  return { steps, edges };
}
