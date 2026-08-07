export function generateSortingSteps(algorithmKey, arrayInput) {
  const arr = [...arrayInput];
  const steps = [];

  switch (algorithmKey) {
    case 'bubbleSort': {
      const n = arr.length;
      let arrayState = [...arr];
      for (let i = 0; i < n - 1; i++) {
        let swapped = false;
        for (let j = 0; j < n - i - 1; j++) {
          steps.push({
            type: 'compare',
            indices: [j, j + 1],
            array: [...arrayState],
            lineHighlight: 6,
            description: `Comparing arr[${j}] (${arrayState[j]}) with arr[${j + 1}] (${arrayState[j + 1]})`
          });
          if (arrayState[j] > arrayState[j + 1]) {
            let temp = arrayState[j];
            arrayState[j] = arrayState[j + 1];
            arrayState[j + 1] = temp;
            swapped = true;
            steps.push({
              type: 'swap',
              indices: [j, j + 1],
              array: [...arrayState],
              lineHighlight: 7,
              description: `Swapped arr[${j}] and arr[${j + 1}] -> [${arrayState.join(', ')}]`
            });
          }
        }
        steps.push({
          type: 'sorted',
          indices: [n - i - 1],
          array: [...arrayState],
          lineHighlight: 10,
          description: `Element ${arrayState[n - i - 1]} at index ${n - i - 1} is in final sorted position`
        });
        if (!swapped) break;
      }
      steps.push({
        type: 'sorted_all',
        indices: Array.from({ length: n }, (_, i) => i),
        array: [...arrayState],
        lineHighlight: 12,
        description: "Bubble Sort Completed successfully!"
      });
      break;
    }

    case 'selectionSort': {
      const n = arr.length;
      let arrayState = [...arr];
      for (let i = 0; i < n - 1; i++) {
        let minIdx = i;
        steps.push({
          type: 'pivot',
          indices: [i],
          array: [...arrayState],
          lineHighlight: 4,
          description: `Set initial minimum at index ${i} (value: ${arrayState[i]})`
        });
        for (let j = i + 1; j < n; j++) {
          steps.push({
            type: 'compare',
            indices: [minIdx, j],
            array: [...arrayState],
            lineHighlight: 6,
            description: `Comparing arr[${j}] (${arrayState[j]}) with current min arr[${minIdx}] (${arrayState[minIdx]})`
          });
          if (arrayState[j] < arrayState[minIdx]) {
            minIdx = j;
            steps.push({
              type: 'pivot',
              indices: [minIdx],
              array: [...arrayState],
              lineHighlight: 7,
              description: `New minimum found at index ${minIdx} (value: ${arrayState[minIdx]})`
            });
          }
        }
        if (minIdx !== i) {
          let temp = arrayState[i];
          arrayState[i] = arrayState[minIdx];
          arrayState[minIdx] = temp;
          steps.push({
            type: 'swap',
            indices: [i, minIdx],
            array: [...arrayState],
            lineHighlight: 11,
            description: `Swapped minimum element ${arrayState[i]} into index ${i}`
          });
        }
        steps.push({
          type: 'sorted',
          indices: [i],
          array: [...arrayState],
          lineHighlight: 13,
          description: `Index ${i} is now sorted!`
        });
      }
      steps.push({
        type: 'sorted_all',
        indices: Array.from({ length: n }, (_, i) => i),
        array: [...arrayState],
        lineHighlight: 15,
        description: "Selection Sort Completed!"
      });
      break;
    }

    case 'insertionSort': {
      const n = arr.length;
      let arrayState = [...arr];
      for (let i = 1; i < n; i++) {
        let key = arrayState[i];
        let j = i - 1;
        steps.push({
          type: 'pivot',
          indices: [i],
          array: [...arrayState],
          lineHighlight: 4,
          description: `Picked key element ${key} at index ${i}`
        });
        while (j >= 0 && arrayState[j] > key) {
          steps.push({
            type: 'compare',
            indices: [j, j + 1],
            array: [...arrayState],
            lineHighlight: 6,
            description: `arr[${j}] (${arrayState[j]}) > key (${key}), shifting arr[${j}] right`
          });
          arrayState[j + 1] = arrayState[j];
          steps.push({
            type: 'overwrite',
            indices: [j + 1],
            array: [...arrayState],
            lineHighlight: 7,
            description: `Shifted element to index ${j + 1}`
          });
          j--;
        }
        arrayState[j + 1] = key;
        steps.push({
          type: 'overwrite',
          indices: [j + 1],
          array: [...arrayState],
          lineHighlight: 10,
          description: `Placed key ${key} into sorted position at index ${j + 1}`
        });
      }
      steps.push({
        type: 'sorted_all',
        indices: Array.from({ length: n }, (_, i) => i),
        array: [...arrayState],
        lineHighlight: 12,
        description: "Insertion Sort Completed!"
      });
      break;
    }

    case 'quickSort': {
      let arrayState = [...arr];
      function partition(low, high) {
        let pivot = arrayState[high];
        steps.push({
          type: 'pivot',
          indices: [high],
          array: [...arrayState],
          lineHighlight: 3,
          description: `Selected pivot ${pivot} at index ${high}`
        });
        let i = low - 1;
        for (let j = low; j < high; j++) {
          steps.push({
            type: 'compare',
            indices: [j, high],
            array: [...arrayState],
            lineHighlight: 6,
            description: `Comparing arr[${j}] (${arrayState[j]}) with pivot (${pivot})`
          });
          if (arrayState[j] < pivot) {
            i++;
            let temp = arrayState[i];
            arrayState[i] = arrayState[j];
            arrayState[j] = temp;
            steps.push({
              type: 'swap',
              indices: [i, j],
              array: [...arrayState],
              lineHighlight: 8,
              description: `Swapped arr[${i}] and arr[${j}]`
            });
          }
        }
        let temp = arrayState[i + 1];
        arrayState[i + 1] = arrayState[high];
        arrayState[high] = temp;
        steps.push({
          type: 'swap',
          indices: [i + 1, high],
          array: [...arrayState],
          lineHighlight: 11,
          description: `Placed pivot ${pivot} into its correct index ${i + 1}`
        });
        return i + 1;
      }

      function qSort(low, high) {
        if (low < high) {
          let pi = partition(low, high);
          qSort(low, pi - 1);
          qSort(pi + 1, high);
        }
      }

      qSort(0, arrayState.length - 1);
      steps.push({
        type: 'sorted_all',
        indices: Array.from({ length: arrayState.length }, (_, i) => i),
        array: [...arrayState],
        lineHighlight: 18,
        description: "Quick Sort Completed!"
      });
      break;
    }

    case 'mergeSort': {
      let arrayState = [...arr];
      function merge(l, m, r) {
        let leftArr = arrayState.slice(l, m + 1);
        let rightArr = arrayState.slice(m + 1, r + 1);
        let i = 0, j = 0, k = l;
        while (i < leftArr.length && j < rightArr.length) {
          steps.push({
            type: 'compare',
            indices: [l + i, m + 1 + j],
            array: [...arrayState],
            lineHighlight: 7,
            description: `Comparing left sub-element ${leftArr[i]} with right sub-element ${rightArr[j]}`
          });
          if (leftArr[i] <= rightArr[j]) {
            arrayState[k] = leftArr[i];
            i++;
          } else {
            arrayState[k] = rightArr[j];
            j++;
          }
          steps.push({
            type: 'overwrite',
            indices: [k],
            array: [...arrayState],
            lineHighlight: 8,
            description: `Merged value ${arrayState[k]} placed at index ${k}`
          });
          k++;
        }
        while (i < leftArr.length) {
          arrayState[k] = leftArr[i];
          steps.push({
            type: 'overwrite',
            indices: [k],
            array: [...arrayState],
            lineHighlight: 11,
            description: `Remaining left sub-element ${arrayState[k]} placed at index ${k}`
          });
          i++; k++;
        }
        while (j < rightArr.length) {
          arrayState[k] = rightArr[j];
          steps.push({
            type: 'overwrite',
            indices: [k],
            array: [...arrayState],
            lineHighlight: 12,
            description: `Remaining right sub-element ${arrayState[k]} placed at index ${k}`
          });
          j++; k++;
        }
      }

      function mSort(l, r) {
        if (l < r) {
          let m = Math.floor(l + (r - l) / 2);
          mSort(l, m);
          mSort(m + 1, r);
          merge(l, m, r);
        }
      }

      mSort(0, arrayState.length - 1);
      steps.push({
        type: 'sorted_all',
        indices: Array.from({ length: arrayState.length }, (_, i) => i),
        array: [...arrayState],
        lineHighlight: 18,
        description: "Merge Sort Completed!"
      });
      break;
    }

    case 'heapSort': {
      let arrayState = [...arr];
      const n = arrayState.length;

      function heapify(n, i) {
        let largest = i;
        let l = 2 * i + 1;
        let r = 2 * i + 2;

        if (l < n) {
          steps.push({
            type: 'compare',
            indices: [l, largest],
            array: [...arrayState],
            lineHighlight: 5,
            description: `Heapify: compare left child arr[${l}] (${arrayState[l]}) with largest arr[${largest}] (${arrayState[largest]})`
          });
          if (arrayState[l] > arrayState[largest]) largest = l;
        }
        if (r < n) {
          steps.push({
            type: 'compare',
            indices: [r, largest],
            array: [...arrayState],
            lineHighlight: 6,
            description: `Heapify: compare right child arr[${r}] (${arrayState[r]}) with largest arr[${largest}] (${arrayState[largest]})`
          });
          if (arrayState[r] > arrayState[largest]) largest = r;
        }

        if (largest !== i) {
          let temp = arrayState[i];
          arrayState[i] = arrayState[largest];
          arrayState[largest] = temp;
          steps.push({
            type: 'swap',
            indices: [i, largest],
            array: [...arrayState],
            lineHighlight: 8,
            description: `Heapify swap: moved ${arrayState[i]} to root position`
          });
          heapify(n, largest);
        }
      }

      for (let i = Math.floor(n / 2) - 1; i >= 0; i--) {
        heapify(n, i);
      }
      for (let i = n - 1; i > 0; i--) {
        let temp = arrayState[0];
        arrayState[0] = arrayState[i];
        arrayState[i] = temp;
        steps.push({
          type: 'swap',
          indices: [0, i],
          array: [...arrayState],
          lineHighlight: 15,
          description: `Extracted max element ${temp} to index ${i}`
        });
        heapify(i, 0);
      }

      steps.push({
        type: 'sorted_all',
        indices: Array.from({ length: n }, (_, i) => i),
        array: [...arrayState],
        lineHighlight: 17,
        description: "Heap Sort Completed!"
      });
      break;
    }

    default:
      break;
  }

  return steps;
}
