export const cppCodeSnippets = {
  // SORTING ALGORITHMS
  bubbleSort: {
    name: "Bubble Sort",
    category: "Sorting",
    timeComplexity: { best: "O(n)", average: "O(n²)", worst: "O(n²)" },
    spaceComplexity: "O(1)",
    code: `// C++ Bubble Sort Implementation
void bubbleSort(std::vector<int>& arr) {
    int n = arr.size();
    for (int i = 0; i < n - 1; ++i) {
        bool swapped = false;
        for (int j = 0; j < n - i - 1; ++j) {
            if (arr[j] > arr[j + 1]) {
                std::swap(arr[j], arr[j + 1]);
                swapped = true;
            }
        }
        if (!swapped) break;
    }
}`
  },
  selectionSort: {
    name: "Selection Sort",
    category: "Sorting",
    timeComplexity: { best: "O(n²)", average: "O(n²)", worst: "O(n²)" },
    spaceComplexity: "O(1)",
    code: `// C++ Selection Sort Implementation
void selectionSort(std::vector<int>& arr) {
    int n = arr.size();
    for (int i = 0; i < n - 1; ++i) {
        int minIdx = i;
        for (int j = i + 1; j < n; ++j) {
            if (arr[j] < arr[minIdx]) {
                minIdx = j;
            }
        }
        if (minIdx != i) {
            std::swap(arr[i], arr[minIdx]);
        }
    }
}`
  },
  insertionSort: {
    name: "Insertion Sort",
    category: "Sorting",
    timeComplexity: { best: "O(n)", average: "O(n²)", worst: "O(n²)" },
    spaceComplexity: "O(1)",
    code: `// C++ Insertion Sort Implementation
void insertionSort(std::vector<int>& arr) {
    int n = arr.size();
    for (int i = 1; i < n; ++i) {
        int key = arr[i];
        int j = i - 1;
        while (j >= 0 && arr[j] > key) {
            arr[j + 1] = arr[j];
            j--;
        }
        arr[j + 1] = key;
    }
}`
  },
  quickSort: {
    name: "Quick Sort",
    category: "Sorting",
    timeComplexity: { best: "O(n log n)", average: "O(n log n)", worst: "O(n²)" },
    spaceComplexity: "O(log n)",
    code: `// C++ Quick Sort Implementation
int partition(std::vector<int>& arr, int low, int high) {
    int pivot = arr[high];
    int i = low - 1;
    for (int j = low; j < high; ++j) {
        if (arr[j] < pivot) {
            i++;
            std::swap(arr[i], arr[j]);
        }
    }
    std::swap(arr[i + 1], arr[high]);
    return i + 1;
}

void quickSort(std::vector<int>& arr, int low, int high) {
    if (low < high) {
        int pi = partition(arr, low, high);
        quickSort(arr, low, pi - 1);
        quickSort(arr, pi + 1, high);
    }
}`
  },
  mergeSort: {
    name: "Merge Sort",
    category: "Sorting",
    timeComplexity: { best: "O(n log n)", average: "O(n log n)", worst: "O(n log n)" },
    spaceComplexity: "O(n)",
    code: `// C++ Merge Sort Implementation
void merge(std::vector<int>& arr, int l, int m, int r) {
    std::vector<int> left(arr.begin() + l, arr.begin() + m + 1);
    std::vector<int> right(arr.begin() + m + 1, arr.begin() + r + 1);
    int i = 0, j = 0, k = l;
    while (i < left.size() && j < right.size()) {
        if (left[i] <= right[j]) arr[k++] = left[i++];
        else arr[k++] = right[j++];
    }
    while (i < left.size()) arr[k++] = left[i++];
    while (j < right.size()) arr[k++] = right[j++];
}

void mergeSort(std::vector<int>& arr, int l, int r) {
    if (l < r) {
        int m = l + (r - l) / 2;
        mergeSort(arr, l, m);
        mergeSort(arr, m + 1, r);
        merge(arr, l, m, r);
    }
}`
  },
  heapSort: {
    name: "Heap Sort",
    category: "Sorting",
    timeComplexity: { best: "O(n log n)", average: "O(n log n)", worst: "O(n log n)" },
    spaceComplexity: "O(1)",
    code: `// C++ Heap Sort Implementation
void heapify(std::vector<int>& arr, int n, int i) {
    int largest = i;
    int l = 2 * i + 1, r = 2 * i + 2;
    if (l < n && arr[l] > arr[largest]) largest = l;
    if (r < n && arr[r] > arr[largest]) largest = r;
    if (largest != i) {
        std::swap(arr[i], arr[largest]);
        heapify(arr, n, largest);
    }
}

void heapSort(std::vector<int>& arr) {
    int n = arr.size();
    for (int i = n / 2 - 1; i >= 0; i--) heapify(arr, n, i);
    for (int i = n - 1; i > 0; i--) {
        std::swap(arr[0], arr[i]);
        heapify(arr, i, 0);
    }
}`
  },

  // GRAPH ALGORITHMS
  dijkstra: {
    name: "Dijkstra's Algorithm",
    category: "Graph",
    timeComplexity: { best: "O((V + E) log V)", average: "O((V + E) log V)", worst: "O((V + E) log V)" },
    spaceComplexity: "O(V)",
    code: `// C++ Dijkstra Shortest Path Implementation
void dijkstra(int startNode, int numNodes, const std::vector<std::vector<std::pair<int,int>>>& adj) {
    std::vector<int> dist(numNodes, 1e9);
    std::priority_queue<std::pair<int,int>, std::vector<std::pair<int,int>>, std::greater<std::pair<int,int>>> pq;
    
    dist[startNode] = 0;
    pq.push({0, startNode});

    while (!pq.empty()) {
        auto [d, u] = pq.top();
        pq.pop();

        if (d > dist[u]) continue;

        for (auto& edge : adj[u]) {
            int v = edge.first, w = edge.second;
            if (dist[u] + w < dist[v]) {
                dist[v] = dist[u] + w;
                pq.push({dist[v], v});
            }
        }
    }
}`
  },
  bfs: {
    name: "Breadth-First Search (BFS)",
    category: "Graph",
    timeComplexity: { best: "O(V + E)", average: "O(V + E)", worst: "O(V + E)" },
    spaceComplexity: "O(V)",
    code: `// C++ BFS Graph Traversal
void bfs(int startNode, const std::vector<std::vector<int>>& adj, std::vector<bool>& visited) {
    std::queue<int> q;
    q.push(startNode);
    visited[startNode] = true;

    while (!q.empty()) {
        int u = q.front();
        q.pop();
        
        for (int v : adj[u]) {
            if (!visited[v]) {
                visited[v] = true;
                q.push(v);
            }
        }
    }
}`
  },
  dfs: {
    name: "Depth-First Search (DFS)",
    category: "Graph",
    timeComplexity: { best: "O(V + E)", average: "O(V + E)", worst: "O(V + E)" },
    spaceComplexity: "O(V)",
    code: `// C++ DFS Graph Traversal
void dfs(int u, const std::vector<std::vector<int>>& adj, std::vector<bool>& visited) {
    visited[u] = true;
    for (int v : adj[u]) {
        if (!visited[v]) {
            dfs(v, adj, visited);
        }
    }
}`
  },
  astar: {
    name: "A* Search Algorithm",
    category: "Graph",
    timeComplexity: { best: "O(E)", average: "O(E log V)", worst: "O(V²)" },
    spaceComplexity: "O(V)",
    code: `// C++ A* Pathfinding Algorithm with Heuristic h(u)
void aStar(int start, int target, const std::vector<std::vector<std::pair<int,int>>>& adj, const std::vector<int>& h) {
    std::vector<int> gScore(adj.size(), 1e9);
    std::priority_queue<std::pair<int,int>, std::vector<std::pair<int,int>>, std::greater<>> openSet;
    
    gScore[start] = 0;
    openSet.push({gScore[start] + h[start], start});

    while (!openSet.empty()) {
        int u = openSet.top().second;
        openSet.pop();
        if (u == target) return;

        for (auto& edge : adj[u]) {
            int v = edge.first, w = edge.second;
            int tentativeG = gScore[u] + w;
            if (tentativeG < gScore[v]) {
                gScore[v] = tentativeG;
                openSet.push({gScore[v] + h[v], v});
            }
        }
    }
}`
  },

  // TREE ALGORITHMS
  bstInsert: {
    name: "BST Insert",
    category: "Tree",
    timeComplexity: { best: "O(log n)", average: "O(log n)", worst: "O(n)" },
    spaceComplexity: "O(h)",
    code: `// C++ Binary Search Tree Insertion
struct Node {
    int data;
    Node* left;
    Node* right;
    Node(int val) : data(val), left(nullptr), right(nullptr) {}
};

Node* insert(Node* root, int val) {
    if (!root) return new Node(val);
    if (val < root->data) {
        root->left = insert(root->left, val);
    } else if (val > root->data) {
        root->right = insert(root->right, val);
    }
    return root;
}`
  },
  bstTraversals: {
    name: "Tree Traversals (Inorder/Preorder/Postorder)",
    category: "Tree",
    timeComplexity: { best: "O(n)", average: "O(n)", worst: "O(n)" },
    spaceComplexity: "O(h)",
    code: `// C++ Tree Traversals
void inorder(Node* root) {
    if (!root) return;
    inorder(root->left);
    std::cout << root->data << " ";
    inorder(root->right);
}

void preorder(Node* root) {
    if (!root) return;
    std::cout << root->data << " ";
    preorder(root->left);
    preorder(root->right);
}

void postorder(Node* root) {
    if (!root) return;
    postorder(root->left);
    postorder(root->right);
    std::cout << root->data << " ";
}`
  },

  // LINKED LIST / DATA STRUCTURES
  linkedListOps: {
    name: "Singly Linked List",
    category: "Data Structures",
    timeComplexity: { best: "O(1) Head, O(n) Tail", average: "O(n)", worst: "O(n)" },
    spaceComplexity: "O(n)",
    code: `// C++ Linked List Pointer Operations
struct Node {
    int data;
    Node* next;
    Node(int val) : data(val), next(nullptr) {}
};

Node* insertHead(Node* head, int val) {
    Node* newNode = new Node(val);
    newNode->next = head;
    return newNode;
}

Node* insertTail(Node* head, int val) {
    Node* newNode = new Node(val);
    if (!head) return newNode;
    Node* temp = head;
    while (temp->next) temp = temp->next;
    temp->next = newNode;
    return head;
}`
  },
  stackQueueOps: {
    name: "Stack & Queue",
    category: "Data Structures",
    timeComplexity: { best: "O(1) Push/Pop", average: "O(1)", worst: "O(1)" },
    spaceComplexity: "O(n)",
    code: `// C++ Stack (LIFO) & Queue (FIFO)
class Stack {
    std::vector<int> st;
public:
    void push(int x) { st.push_back(x); }
    void pop() { if(!st.empty()) st.pop_back(); }
    int top() { return st.back(); }
};

class Queue {
    std::deque<int> q;
public:
    void enqueue(int x) { q.push_back(x); }
    void dequeue() { if(!q.empty()) q.pop_front(); }
    int front() { return q.front(); }
};`
  }
};
