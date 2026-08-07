export class BST {
  constructor() {
    this.root = null;
  }
}

export function generateTreeSteps(operation, valuesToInsert = [50, 30, 70, 20, 40, 60, 80], targetValue = 40) {
  const steps = [];

  class TreeNode {
    constructor(val) {
      this.val = val;
      this.left = null;
      this.right = null;
    }
  }

  let root = null;
  const treeNodes = [];

  function insertNode(r, val) {
    if (!r) {
      const newNode = new TreeNode(val);
      treeNodes.push(val);
      steps.push({
        type: 'insert',
        currentNode: val,
        visitedNodes: [val],
        treeValues: [...treeNodes],
        lineHighlight: 9,
        description: `Created new node with value ${val}`
      });
      return newNode;
    }
    steps.push({
      type: 'search',
      currentNode: r.val,
      visitedNodes: [r.val],
      treeValues: [...treeNodes],
      lineHighlight: 10,
      description: `Comparing value ${val} with current node ${r.val}`
    });
    if (val < r.val) {
      r.left = insertNode(r.left, val);
    } else if (val > r.val) {
      r.right = insertNode(r.right, val);
    }
    return r;
  }

  valuesToInsert.forEach(v => {
    root = insertNode(root, v);
  });

  if (operation === 'bstTraversals') {
    const visitedList = [];
    function inorder(r) {
      if (!r) return;
      inorder(r.left);
      visitedList.push(r.val);
      steps.push({
        type: 'traverse',
        currentNode: r.val,
        visitedNodes: [...visitedList],
        treeValues: [...treeNodes],
        lineHighlight: 4,
        description: `Inorder traversal visited node ${r.val}`
      });
      inorder(r.right);
    }
    inorder(root);
  } else if (operation === 'bstInsert') {
    const newValue = 45;
    root = insertNode(root, newValue);
  }

  return { steps, rootValues: treeNodes };
}
