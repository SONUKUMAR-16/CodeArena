// backend/populate_data.js
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const User = require('./src/models/user');
const Problem = require('./src/models/problem');
const Submission = require('./src/models/submission');

const uri = 'mongodb+srv://sonu:sonu123@cluster0.wva2ta3.mongodb.net/Leetcode';

async function populateDatabase() {
  try {
    console.log("Connecting to MongoDB Atlas...");
    await mongoose.connect(uri);
    console.log("Connected to MongoDB Atlas!");

    // 1. Setup / Upgrade User to Admin
    const email = 'sonukumar.240529@gmail.com';
    const hashedPassword = await bcrypt.hash('Sonu@123', 10);

    let user = await User.findOne({ emailid: email });
    if (!user) {
      user = await User.create({
        firstname: 'sonu',
        lastName: 'Kumar',
        emailid: email,
        password: hashedPassword,
        role: 'admin'
      });
      console.log(`Created admin user: ${email}`);
    } else {
      user.password = hashedPassword;
      user.role = 'admin';
      if (!user.firstname || user.firstname.trim() === '') user.firstname = 'sonu';
      await user.save();
      console.log(`Upgraded existing user ${email} to admin role with updated password!`);
    }

    const adminId = user._id;

    // 2. Curated LeetCode Problems List
    const newProblemsData = [
      {
        title: "Two Sum",
        description: "Given an array of integers `nums` and an integer `target`, return indices of the two numbers such that they add up to `target`.\n\nYou may assume that each input would have exactly one solution, and you may not use the same element twice.",
        difficulty: "easy",
        tags: "array",
        problemcreator: adminId,
        visibletestcases: [
          {
            input: "[2,7,11,15]\n9",
            output: "[0,1]",
            explanation: "Because nums[0] + nums[1] == 9, we return [0, 1]."
          },
          {
            input: "[3,2,4]\n6",
            output: "[1,2]",
            explanation: "Because nums[1] + nums[2] == 6, we return [1, 2]."
          }
        ],
        hiddentestcases: [
          { input: "[3,3]\n6", output: "[0,1]" }
        ],
        startcode: [
          { language: "javascript", initialcode: "function twoSum(nums, target) {\n  // Write code here\n};" },
          { language: "c++", initialcode: "class Solution {\npublic:\n    vector<int> twoSum(vector<int>& nums, int target) {\n        \n    }\n};" },
          { language: "java", initialcode: "class Solution {\n    public int[] twoSum(int[] nums, int target) {\n        \n    }\n}" }
        ],
        referencesolution: [
          { language: "javascript", completecode: "function twoSum(nums, target) {\n  const map = new Map();\n  for (let i = 0; i < nums.length; i++) {\n    const diff = target - nums[i];\n    if (map.has(diff)) return [map.get(diff), i];\n    map.set(nums[i], i);\n  }\n  return [];\n};" }
        ]
      },
      {
        title: "Valid Parentheses",
        description: "Given a string `s` containing just the characters `'('`, `')'`, `'{'`, `'}'`, `'['` and `']'`, determine if the input string is valid.\n\nAn input string is valid if:\n1. Open brackets must be closed by the same type of brackets.\n2. Open brackets must be closed in the correct order.",
        difficulty: "easy",
        tags: "string",
        problemcreator: adminId,
        visibletestcases: [
          { input: "\"()\"", output: "true", explanation: "Matching parentheses." },
          { input: "\"()[]{}\"", output: "true", explanation: "All opening brackets correctly closed." },
          { input: "\"(]\"", output: "false", explanation: "Mismatch bracket types." }
        ],
        hiddentestcases: [
          { input: "\"([)]\"", output: "false" }
        ],
        startcode: [
          { language: "javascript", initialcode: "function isValid(s) {\n  // Write code here\n};" },
          { language: "c++", initialcode: "class Solution {\npublic:\n    bool isValid(string s) {\n        \n    }\n}; font-mono" }
        ],
        referencesolution: [
          { language: "javascript", completecode: "function isValid(s) {\n  const stack = [];\n  const map = { ')': '(', '}': '{', ']': '[' };\n  for (let char of s) {\n    if (!map[char]) stack.push(char);\n    else if (stack.pop() !== map[char]) return false;\n  }\n  return stack.length === 0;\n};" }
        ]
      },
      {
        title: "Reverse Linked List",
        description: "Given the head of a singly linked list, reverse the list, and return the reversed list.",
        difficulty: "easy",
        tags: "linkedlist",
        problemcreator: adminId,
        visibletestcases: [
          { input: "[1,2,3,4,5]", output: "[5,4,3,2,1]", explanation: "Elements are reversed in linear order." },
          { input: "[1,2]", output: "[2,1]", explanation: "Two elements reversed." }
        ],
        hiddentestcases: [
          { input: "[]", output: "[]" }
        ],
        startcode: [
          { language: "javascript", initialcode: "function reverseList(head) {\n  // Write code here\n};" }
        ],
        referencesolution: [
          { language: "javascript", completecode: "function reverseList(head) {\n  let prev = null, curr = head;\n  while (curr) {\n    let next = curr.next;\n    curr.next = prev;\n    prev = curr;\n    curr = next;\n  }\n  return prev;\n};" }
        ]
      },
      {
        title: "Longest Substring Without Repeating Characters",
        description: "Given a string `s`, find the length of the longest substring without repeating characters.",
        difficulty: "medium",
        tags: "string",
        problemcreator: adminId,
        visibletestcases: [
          { input: "\"abcabcbb\"", output: "3", explanation: "The answer is 'abc', with length 3." },
          { input: "\"bbbbb\"", output: "1", explanation: "The answer is 'b', with length 1." }
        ],
        hiddentestcases: [
          { input: "\"pwwkew\"", output: "3" }
        ],
        startcode: [
          { language: "javascript", initialcode: "function lengthOfLongestSubstring(s) {\n  // Write code here\n};" }
        ],
        referencesolution: [
          { language: "javascript", completecode: "function lengthOfLongestSubstring(s) {\n  let set = new Set(), left = 0, maxLen = 0;\n  for (let right = 0; right < s.length; right++) {\n    while (set.has(s[right])) {\n      set.delete(s[left]);\n      left++;\n    }\n    set.add(s[right]);\n    maxLen = Math.max(maxLen, right - left + 1);\n  }\n  return maxLen;\n};" }
        ]
      },
      {
        title: "Binary Search",
        description: "Given an array of integers `nums` which is sorted in ascending order, and an integer `target`, write a function to search `target` in `nums`. If `target` exists, then return its index. Otherwise, return `-1`.\n\nYou must write an algorithm with `O(log n)` runtime complexity.",
        difficulty: "easy",
        tags: "binarysearch",
        problemcreator: adminId,
        visibletestcases: [
          { input: "nums = [-1,0,3,5,9,12], target = 9", output: "4", explanation: "9 exists in nums and its index is 4." },
          { input: "nums = [-1,0,3,5,9,12], target = 2", output: "-1", explanation: "2 does not exist in nums so return -1." }
        ],
        hiddentestcases: [
          { input: "nums = [5], target = 5", output: "0" }
        ],
        startcode: [
          { language: "javascript", initialcode: "function search(nums, target) {\n  // Write code here\n};" }
        ],
        referencesolution: [
          { language: "javascript", completecode: "function search(nums, target) {\n  let left = 0, right = nums.length - 1;\n  while (left <= right) {\n    let mid = Math.floor((left + right) / 2);\n    if (nums[mid] === target) return mid;\n    if (nums[mid] < target) left = mid + 1;\n    else right = mid - 1;\n  }\n  return -1;\n};" }
        ]
      },
      {
        title: "Climbing Stairs",
        description: "You are climbing a staircase. It takes `n` steps to reach the top.\n\nEach time you can either climb 1 or 2 steps. In how many distinct ways can you climb to the top?",
        difficulty: "easy",
        tags: "dp",
        problemcreator: adminId,
        visibletestcases: [
          { input: "2", output: "2", explanation: "1 step + 1 step, or 2 steps." },
          { input: "3", output: "3", explanation: "1+1+1, 1+2, or 2+1." }
        ],
        hiddentestcases: [
          { input: "4", output: "5" }
        ],
        startcode: [
          { language: "javascript", initialcode: "function climbStairs(n) {\n  // Write code here\n};" }
        ],
        referencesolution: [
          { language: "javascript", completecode: "function climbStairs(n) {\n  if (n <= 2) return n;\n  let a = 1, b = 2;\n  for (let i = 3; i <= n; i++) {\n    let temp = a + b;\n    a = b;\n    b = temp;\n  }\n  return b;\n};" }
        ]
      },
      {
        title: "Container With Most Water",
        description: "You are given an integer array `height` of length `n`. There are `n` vertical lines drawn such that the two endpoints of the `i-th` line are `(i, 0)` and `(i, height[i])`.\n\nFind two lines that together with the x-axis form a container, such that the container contains the most water.\n\nReturn the maximum amount of water a container can store.",
        difficulty: "medium",
        tags: "array",
        problemcreator: adminId,
        visibletestcases: [
          { input: "[1,8,6,2,5,4,8,3,7]", output: "49", explanation: "The max area of water the container can contain is 49." }
        ],
        hiddentestcases: [
          { input: "[1,1]", output: "1" }
        ],
        startcode: [
          { language: "javascript", initialcode: "function maxArea(height) {\n  // Write code here\n};" }
        ],
        referencesolution: [
          { language: "javascript", completecode: "function maxArea(height) {\n  let left = 0, right = height.length - 1, max = 0;\n  while (left < right) {\n    let area = Math.min(height[left], height[right]) * (right - left);\n    max = Math.max(max, area);\n    if (height[left] < height[right]) left++;\n    else right--;\n  }\n  return max;\n};" }
        ]
      }
    ];

    const insertedProblems = [];
    for (let pData of newProblemsData) {
      let existingProb = await Problem.findOne({ title: pData.title });
      if (!existingProb) {
        existingProb = await Problem.create(pData);
        console.log(`✅ Created Problem: ${existingProb.title}`);
      } else {
        console.log(`ℹ️ Problem already exists: ${existingProb.title}`);
      }
      insertedProblems.push(existingProb);
    }

    // 3. Create Solved Submissions for User 'sonu'
    const solvedProblemsToInsert = insertedProblems.slice(0, 4); // Solve first 4 problems
    const solvedIds = [];

    for (let prob of solvedProblemsToInsert) {
      solvedIds.push(prob._id);

      // Check if submission already exists
      const existingSub = await Submission.findOne({ userid: user._id, problemid: prob._id, status: 'accepted' });
      if (!existingSub) {
        const sub = await Submission.create({
          problemid: prob._id,
          userid: user._id,
          code: prob.referencesolution?.[0]?.completecode || "// Solution code",
          language: 'javascript',
          status: 'accepted',
          runtime: Math.floor(Math.random() * 40) + 30, // 30-70ms
          memory: Math.floor(Math.random() * 10) + 40,  // 40-50MB
          testcasespassed: (prob.visibletestcases?.length || 0) + (prob.hiddentestcases?.length || 0),
          testcasestotal: (prob.visibletestcases?.length || 0) + (prob.hiddentestcases?.length || 0)
        });
        console.log(`🎉 Created Accepted Submission for problem: ${prob.title}`);
      }
    }

    // 4. Update User's problemsolved array
    const uniqueSolved = Array.from(new Set([...(user.problemsolved || []).map(id => id.toString()), ...solvedIds.map(id => id.toString())]));
    user.problemsolved = uniqueSolved;
    await user.save();
    console.log(`✅ Updated user ${user.emailid}'s solved problems count to: ${uniqueSolved.length}`);

    console.log("🚀 Database successfully populated!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Error populating database:", error);
    process.exit(1);
  }
}

populateDatabase();
