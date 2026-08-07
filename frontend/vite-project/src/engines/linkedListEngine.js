export function generateLinkedListSteps(action, initialList = [10, 20, 30, 40], newValue = 50) {
  const steps = [];
  let list = [...initialList];

  if (action === 'insertHead') {
    steps.push({
      type: 'allocate',
      highlightIndex: 0,
      activeValue: newValue,
      list: [...list],
      lineHighlight: 9,
      description: `Created new Node(${newValue}) in memory`
    });
    list = [newValue, ...list];
    steps.push({
      type: 'pointer_update',
      highlightIndex: 0,
      activeValue: newValue,
      list: [...list],
      lineHighlight: 10,
      description: `Updated HEAD pointer to point to new Node(${newValue})`
    });
  } else if (action === 'insertTail') {
    for (let i = 0; i < list.length; i++) {
      steps.push({
        type: 'traverse',
        highlightIndex: i,
        activeValue: list[i],
        list: [...list],
        lineHighlight: 16,
        description: `Traversing list pointer: at node index ${i} (${list[i]})`
      });
    }
    list = [...list, newValue];
    steps.push({
      type: 'pointer_update',
      highlightIndex: list.length - 1,
      activeValue: newValue,
      list: [...list],
      lineHighlight: 18,
      description: `Linked tail pointer to new Node(${newValue})`
    });
  } else if (action === 'deleteHead') {
    steps.push({
      type: 'delete',
      highlightIndex: 0,
      activeValue: list[0],
      list: [...list],
      lineHighlight: 10,
      description: `Unlinking HEAD node (${list[0]})`
    });
    list = list.slice(1);
    steps.push({
      type: 'pointer_update',
      highlightIndex: 0,
      activeValue: list[0],
      list: [...list],
      lineHighlight: 11,
      description: `Updated HEAD pointer to node (${list[0]})`
    });
  }

  return steps;
}

export function generateStackQueueSteps(action, initialItems = [15, 28, 42], value = 99) {
  const steps = [];
  let items = [...initialItems];

  if (action === 'pushStack') {
    steps.push({
      type: 'stack_push',
      activeValue: value,
      items: [...items],
      lineHighlight: 5,
      description: `Preparing to push element ${value} onto Stack TOP`
    });
    items.push(value);
    steps.push({
      type: 'stack_top',
      activeValue: value,
      items: [...items],
      lineHighlight: 6,
      description: `Pushed ${value} onto Stack TOP. New size: ${items.length}`
    });
  } else if (action === 'popStack') {
    const topVal = items[items.length - 1];
    steps.push({
      type: 'stack_pop',
      activeValue: topVal,
      items: [...items],
      lineHighlight: 7,
      description: `Popping top element ${topVal} from Stack (LIFO)`
    });
    items.pop();
    steps.push({
      type: 'stack_top',
      activeValue: items[items.length - 1] || null,
      items: [...items],
      lineHighlight: 8,
      description: `Element popped. Stack size is now ${items.length}`
    });
  } else if (action === 'enqueueQueue') {
    steps.push({
      type: 'queue_enqueue',
      activeValue: value,
      items: [...items],
      lineHighlight: 14,
      description: `Enqueuing element ${value} to Queue REAR (FIFO)`
    });
    items.push(value);
    steps.push({
      type: 'queue_rear',
      activeValue: value,
      items: [...items],
      lineHighlight: 15,
      description: `Enqueued ${value} to REAR. Queue length: ${items.length}`
    });
  } else if (action === 'dequeueQueue') {
    const frontVal = items[0];
    steps.push({
      type: 'queue_dequeue',
      activeValue: frontVal,
      items: [...items],
      lineHighlight: 16,
      description: `Dequeuing front element ${frontVal} from Queue FRONT`
    });
    items.shift();
    steps.push({
      type: 'queue_front',
      activeValue: items[0] || null,
      items: [...items],
      lineHighlight: 17,
      description: `Dequeued ${frontVal}. New FRONT is ${items[0] || 'EMPTY'}`
    });
  }

  return steps;
}
