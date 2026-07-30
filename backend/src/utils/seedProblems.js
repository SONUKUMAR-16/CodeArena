const Problem = require('../models/problem');
const User = require('../models/user');
const bcrypt = require('bcrypt');

const seedProblems = async () => {
    try {
        const count = await Problem.countDocuments();
        if (count > 0) {
            console.log(`📊 Problems already exist in DB (${count} problems found).`);
            return;
        }

        console.log("🌱 Database has 0 problems. Seeding sample problems...");

        // Ensure a dummy admin user exists for creator reference
        let adminUser = await User.findOne({ role: 'admin' });
        if (!adminUser) {
            const hashedPassword = await bcrypt.hash('Admin@123', 10);
            adminUser = await User.create({
                firstname: 'Admin',
                lastname: 'System',
                emailid: 'admin@leetcode.com',
                password: hashedPassword,
                role: 'admin'
            });
            console.log('✅ Created default admin user: admin@leetcode.com');
        }

        const sampleProblems = [
            {
                title: "Two Sum",
                description: "Given an array of integers `nums` and an integer `target`, return indices of the two numbers such that they add up to `target`.\n\nYou may assume that each input would have exactly one solution, and you may not use the same element twice.",
                difficulty: "easy",
                tags: "array",
                problemcreator: adminUser._id,
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
                    {
                        input: "[3,3]\n6",
                        output: "[0,1]"
                    }
                ],
                startcode: [
                    {
                        language: "javascript",
                        initialcode: "function twoSum(nums, target) {\n    // Write your code here\n};"
                    },
                    {
                        language: "java",
                        initialcode: "class Solution {\n    public int[] twoSum(int[] nums, int target) {\n        \n    }\n}"
                    },
                    {
                        language: "c++",
                        initialcode: "class Solution {\npublic:\n    vector<int> twoSum(vector<int>& nums, int target) {\n        \n    }\n};"
                    }
                ],
                referencesolution: [
                    {
                        language: "javascript",
                        completecode: "function twoSum(nums, target) {\n    const map = new Map();\n    for (let i = 0; i < nums.length; i++) {\n        const diff = target - nums[i];\n        if (map.has(diff)) return [map.get(diff), i];\n        map.set(nums[i], i);\n    }\n    return [];\n};"
                    }
                ]
            },
            {
                title: "Palindrome Number",
                description: "Given an integer `x`, return `true` if `x` is a palindrome, and `false` otherwise.\n\nAn integer is a palindrome when it reads the same backward as forward.",
                difficulty: "easy",
                tags: "math",
                problemcreator: adminUser._id,
                visibletestcases: [
                    {
                        input: "121",
                        output: "true",
                        explanation: "121 reads as 121 from left to right and from right to left."
                    },
                    {
                        input: "-121",
                        output: "false",
                        explanation: "From left to right, it reads -121. From right to left, it becomes 121-. Therefore it is not a palindrome."
                    }
                ],
                hiddentestcases: [
                    {
                        input: "10",
                        output: "false"
                    }
                ],
                startcode: [
                    {
                        language: "javascript",
                        initialcode: "function isPalindrome(x) {\n    // Write your code here\n};"
                    }
                ],
                referencesolution: [
                    {
                        language: "javascript",
                        completecode: "function isPalindrome(x) {\n    if (x < 0) return false;\n    const str = x.toString();\n    return str === str.split('').reverse().join('');\n};"
                    }
                ]
            },
            {
                title: "Reverse String",
                description: "Write a function that reverses a string. The input string is given as an array of characters `s`.\n\nYou must do this by modifying the input array in-place with O(1) extra memory.",
                difficulty: "easy",
                tags: "string",
                problemcreator: adminUser._id,
                visibletestcases: [
                    {
                        input: '["h","e","l","l","o"]',
                        output: '["o","l","l","e","h"]',
                        explanation: "Reversed array of characters."
                    }
                ],
                hiddentestcases: [
                    {
                        input: '["H","a","n","n","a","h"]',
                        output: '["h","a","n","n","a","H"]'
                    }
                ],
                startcode: [
                    {
                        language: "javascript",
                        initialcode: "function reverseString(s) {\n    // Write your code here\n};"
                    }
                ],
                referencesolution: [
                    {
                        language: "javascript",
                        completecode: "function reverseString(s) {\n    return s.reverse();\n};"
                    }
                ]
            }
        ];

        await Problem.insertMany(sampleProblems);
        console.log(`✅ Seeded ${sampleProblems.length} sample problems successfully!`);
    } catch (err) {
        console.error("❌ Error seeding problems:", err);
    }
};

module.exports = seedProblems;
