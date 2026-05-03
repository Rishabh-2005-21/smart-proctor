import vm from "node:vm";

const buildStarterTemplates = (functionName, params = [], jsBody = "") => {
  const jsParams = params.join(", ");
  const pythonName = functionName.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);

  return {
    JavaScript: `function ${functionName}(${jsParams}) {\n  ${jsBody || "// Write your solution here"}\n}\n\nmodule.exports = ${functionName};`,
    Python: `def ${pythonName}(${jsParams}):\n    # Write your solution here\n    pass`,
    Java: `class Solution {\n    public static Object ${functionName}(${jsParams || ""}) {\n        // Write your solution here\n        return null;\n    }\n}`,
    "C++": `#include <bits/stdc++.h>\nusing namespace std;\n\nauto ${functionName}(${jsParams}) {\n    // Write your solution here\n}`
  };
};

const CHALLENGE_BANK = [
  {
    id: "truncate-sentence",
    topic: "arrays / strings / basic algorithms",
    difficulty: "easy",
    title: "Truncate Sentence",
    description:
      "Return the first k words from the given sentence without changing their order.",
    inputFormat: "sentence: string, k: number",
    outputFormat: "string",
    functionName: "truncateSentence",
    parameters: ["sentence", "k"],
    constraints: [
      "1 <= sentence.length <= 200",
      "1 <= k <= number of words in sentence"
    ],
    hints: [
      "Split the sentence into words once.",
      "Join only the first k words in the original order."
    ],
    starterCode: buildStarterTemplates("truncateSentence", ["sentence", "k"], "return sentence;"),
    publicTests: [
      {
        input: ["Smart Proctor helps students prepare better", 4],
        expected: "Smart Proctor helps students",
        explanation: "Keep the first four words."
      },
      {
        input: ["one two three", 2],
        expected: "one two",
        explanation: "Only the first two words remain."
      }
    ],
    hiddenTests: [
      {
        input: ["placements need consistent daily revision", 5],
        expected: "placements need consistent daily revision"
      },
      {
        input: ["react node mongo", 1],
        expected: "react"
      }
    ]
  },
  {
    id: "two-sum",
    topic: "arrays / strings / basic algorithms",
    difficulty: "medium",
    title: "Two Sum Indices",
    description:
      "Given an integer array and a target value, return the indices of the two numbers that add up to the target.",
    inputFormat: "nums: number[], target: number",
    outputFormat: "number[]",
    functionName: "twoSum",
    parameters: ["nums", "target"],
    constraints: [
      "2 <= nums.length <= 10^4",
      "Exactly one valid answer exists in each test."
    ],
    hints: [
      "Track numbers you have seen in a hash map.",
      "For each value, look for target - value before moving on."
    ],
    starterCode: buildStarterTemplates("twoSum", ["nums", "target"], "return [];"),
    publicTests: [
      {
        input: [[2, 7, 11, 15], 9],
        expected: [0, 1],
        explanation: "2 + 7 = 9"
      },
      {
        input: [[3, 2, 4], 6],
        expected: [1, 2],
        explanation: "2 + 4 = 6"
      }
    ],
    hiddenTests: [
      {
        input: [[3, 3], 6],
        expected: [0, 1]
      },
      {
        input: [[1, 5, 8, 10], 18],
        expected: [2, 3]
      }
    ]
  },
  {
    id: "longest-unique-substring",
    topic: "arrays / strings / basic algorithms",
    difficulty: "hard",
    title: "Longest Unique Substring",
    description:
      "Return the length of the longest substring that contains no repeating characters.",
    inputFormat: "s: string",
    outputFormat: "number",
    functionName: "lengthOfLongestUniqueSubstring",
    parameters: ["s"],
    constraints: [
      "0 <= s.length <= 10^5"
    ],
    hints: [
      "Use a sliding window.",
      "Store the latest index of each character."
    ],
    starterCode: buildStarterTemplates("lengthOfLongestUniqueSubstring", ["s"], "return 0;"),
    publicTests: [
      {
        input: ["abcabcbb"],
        expected: 3,
        explanation: "The answer is abc."
      },
      {
        input: ["bbbbb"],
        expected: 1,
        explanation: "The answer is b."
      }
    ],
    hiddenTests: [
      {
        input: ["pwwkew"],
        expected: 3
      },
      {
        input: [""],
        expected: 0
      }
    ]
  },
  {
    id: "first-unique-index",
    topic: "hash maps and sets",
    difficulty: "easy",
    title: "First Unique Character",
    description:
      "Return the index of the first non-repeating character in the string, or -1 if none exists.",
    inputFormat: "s: string",
    outputFormat: "number",
    functionName: "firstUniqueIndex",
    parameters: ["s"],
    constraints: [
      "1 <= s.length <= 10^5"
    ],
    hints: [
      "Count each character first.",
      "Scan again to find the first character with count 1."
    ],
    starterCode: buildStarterTemplates("firstUniqueIndex", ["s"], "return -1;"),
    publicTests: [
      {
        input: ["leetcode"],
        expected: 0,
        explanation: "l appears only once."
      },
      {
        input: ["loveleetcode"],
        expected: 2,
        explanation: "v is the first unique character."
      }
    ],
    hiddenTests: [
      {
        input: ["aabb"],
        expected: -1
      },
      {
        input: ["z"],
        expected: 0
      }
    ]
  },
  {
    id: "word-pattern-match",
    topic: "hash maps and sets",
    difficulty: "medium",
    title: "Word Pattern Match",
    description:
      "Return true if the sentence follows the same pattern where each pattern character maps to exactly one word.",
    inputFormat: "pattern: string, sentence: string",
    outputFormat: "boolean",
    functionName: "wordPatternMatch",
    parameters: ["pattern", "sentence"],
    constraints: [
      "Pattern length and word count may differ.",
      "A word cannot map to two different pattern characters."
    ],
    hints: [
      "Use two hash maps or a map and a set.",
      "Split the sentence into words before comparing positions."
    ],
    starterCode: buildStarterTemplates("wordPatternMatch", ["pattern", "sentence"], "return false;"),
    publicTests: [
      {
        input: ["abba", "dog cat cat dog"],
        expected: true,
        explanation: "a maps to dog, b maps to cat."
      },
      {
        input: ["abba", "dog cat cat fish"],
        expected: false,
        explanation: "The last word breaks the pattern."
      }
    ],
    hiddenTests: [
      {
        input: ["aaaa", "dog dog dog dog"],
        expected: true
      },
      {
        input: ["ab", "dog dog"],
        expected: false
      }
    ]
  },
  {
    id: "longest-consecutive",
    topic: "hash maps and sets",
    difficulty: "hard",
    title: "Longest Consecutive Sequence",
    description:
      "Return the length of the longest consecutive elements sequence in the array.",
    inputFormat: "nums: number[]",
    outputFormat: "number",
    functionName: "longestConsecutive",
    parameters: ["nums"],
    constraints: [
      "0 <= nums.length <= 10^5"
    ],
    hints: [
      "A set gives O(1) membership checks.",
      "Only start counting when the current number has no predecessor."
    ],
    starterCode: buildStarterTemplates("longestConsecutive", ["nums"], "return 0;"),
    publicTests: [
      {
        input: [[100, 4, 200, 1, 3, 2]],
        expected: 4,
        explanation: "The longest run is 1,2,3,4."
      },
      {
        input: [[0, 3, 7, 2, 5, 8, 4, 6, 0, 1]],
        expected: 9,
        explanation: "The longest run is 0 through 8."
      }
    ],
    hiddenTests: [
      {
        input: [[]],
        expected: 0
      },
      {
        input: [[9, 1, 4, 7, 3, 2, 6, 5]],
        expected: 7
      }
    ]
  },
  {
    id: "sum-to-n",
    topic: "recursion and backtracking",
    difficulty: "easy",
    title: "Recursive Sum To N",
    description:
      "Use recursion to return the sum of all numbers from 1 to n.",
    inputFormat: "n: number",
    outputFormat: "number",
    functionName: "sumToN",
    parameters: ["n"],
    constraints: [
      "1 <= n <= 1000"
    ],
    hints: [
      "Think about the base case first.",
      "sumToN(n) = n + sumToN(n - 1)"
    ],
    starterCode: buildStarterTemplates("sumToN", ["n"], "return 0;"),
    publicTests: [
      {
        input: [4],
        expected: 10,
        explanation: "1 + 2 + 3 + 4 = 10."
      },
      {
        input: [1],
        expected: 1,
        explanation: "Base case."
      }
    ],
    hiddenTests: [
      {
        input: [10],
        expected: 55
      },
      {
        input: [7],
        expected: 28
      }
    ]
  },
  {
    id: "subset-sum-exists",
    topic: "recursion and backtracking",
    difficulty: "medium",
    title: "Subset Sum Exists",
    description:
      "Return true if any subset of the numbers can add up exactly to the target.",
    inputFormat: "nums: number[], target: number",
    outputFormat: "boolean",
    functionName: "subsetSumExists",
    parameters: ["nums", "target"],
    constraints: [
      "1 <= nums.length <= 20",
      "1 <= target <= 200"
    ],
    hints: [
      "At each index, choose to include or skip the current number.",
      "Stop early when the target becomes 0."
    ],
    starterCode: buildStarterTemplates("subsetSumExists", ["nums", "target"], "return false;"),
    publicTests: [
      {
        input: [[3, 34, 4, 12, 5, 2], 9],
        expected: true,
        explanation: "4 + 5 = 9."
      },
      {
        input: [[3, 34, 4, 12, 5, 2], 30],
        expected: false,
        explanation: "No subset adds to 30."
      }
    ],
    hiddenTests: [
      {
        input: [[1, 2, 3, 7], 6],
        expected: true
      },
      {
        input: [[1, 2, 7, 8], 5],
        expected: false
      }
    ]
  },
  {
    id: "combination-sum-count",
    topic: "recursion and backtracking",
    difficulty: "hard",
    title: "Combination Count",
    description:
      "Return the number of unique combinations that add up to the target using each candidate any number of times.",
    inputFormat: "candidates: number[], target: number",
    outputFormat: "number",
    functionName: "combinationSumCount",
    parameters: ["candidates", "target"],
    constraints: [
      "1 <= candidates.length <= 10",
      "1 <= target <= 40"
    ],
    hints: [
      "Sort candidates if it simplifies recursion.",
      "Stay on the same index when you choose the current candidate."
    ],
    starterCode: buildStarterTemplates("combinationSumCount", ["candidates", "target"], "return 0;"),
    publicTests: [
      {
        input: [[2, 3, 6, 7], 7],
        expected: 2,
        explanation: "The combinations are [7] and [2,2,3]."
      },
      {
        input: [[2, 3, 5], 8],
        expected: 3,
        explanation: "The combinations are [2,2,2,2], [2,3,3], [3,5]."
      }
    ],
    hiddenTests: [
      {
        input: [[2], 1],
        expected: 0
      },
      {
        input: [[1], 3],
        expected: 1
      }
    ]
  },
  {
    id: "climbing-stairs",
    topic: "dynamic programming",
    difficulty: "easy",
    title: "Climbing Stairs",
    description:
      "You can take 1 or 2 steps at a time. Return how many distinct ways there are to reach the top.",
    inputFormat: "n: number",
    outputFormat: "number",
    functionName: "climbStairs",
    parameters: ["n"],
    constraints: [
      "1 <= n <= 45"
    ],
    hints: [
      "The answer for n depends on the previous two steps.",
      "This follows a Fibonacci-like pattern."
    ],
    starterCode: buildStarterTemplates("climbStairs", ["n"], "return 0;"),
    publicTests: [
      {
        input: [2],
        expected: 2,
        explanation: "1+1 or 2"
      },
      {
        input: [3],
        expected: 3,
        explanation: "111, 12, 21"
      }
    ],
    hiddenTests: [
      {
        input: [5],
        expected: 8
      },
      {
        input: [1],
        expected: 1
      }
    ]
  },
  {
    id: "house-robber",
    topic: "dynamic programming",
    difficulty: "medium",
    title: "House Robber",
    description:
      "Return the maximum amount of money you can rob without robbing two adjacent houses.",
    inputFormat: "nums: number[]",
    outputFormat: "number",
    functionName: "houseRobber",
    parameters: ["nums"],
    constraints: [
      "1 <= nums.length <= 100",
      "0 <= nums[i] <= 400"
    ],
    hints: [
      "Track the best total if you rob or skip the current house.",
      "Each decision depends on the previous two positions."
    ],
    starterCode: buildStarterTemplates("houseRobber", ["nums"], "return 0;"),
    publicTests: [
      {
        input: [[1, 2, 3, 1]],
        expected: 4,
        explanation: "Rob houses 1 and 3."
      },
      {
        input: [[2, 7, 9, 3, 1]],
        expected: 12,
        explanation: "Rob 2, 9, and 1."
      }
    ],
    hiddenTests: [
      {
        input: [[2, 1, 1, 2]],
        expected: 4
      },
      {
        input: [[5]],
        expected: 5
      }
    ]
  },
  {
    id: "coin-change",
    topic: "dynamic programming",
    difficulty: "hard",
    title: "Minimum Coin Change",
    description:
      "Return the fewest number of coins needed to make up the target amount, or -1 if it is impossible.",
    inputFormat: "coins: number[], amount: number",
    outputFormat: "number",
    functionName: "coinChangeMin",
    parameters: ["coins", "amount"],
    constraints: [
      "1 <= coins.length <= 12",
      "0 <= amount <= 10^4"
    ],
    hints: [
      "Use dynamic programming from 0 up to amount.",
      "Initialize unreachable states with a large value."
    ],
    starterCode: buildStarterTemplates("coinChangeMin", ["coins", "amount"], "return -1;"),
    publicTests: [
      {
        input: [[1, 2, 5], 11],
        expected: 3,
        explanation: "11 = 5 + 5 + 1"
      },
      {
        input: [[2], 3],
        expected: -1,
        explanation: "Impossible amount."
      }
    ],
    hiddenTests: [
      {
        input: [[1], 0],
        expected: 0
      },
      {
        input: [[1, 3, 4], 6],
        expected: 2
      }
    ]
  },
  {
    id: "count-reachable-nodes",
    topic: "graphs and trees",
    difficulty: "easy",
    title: "Count Reachable Nodes",
    description:
      "Given an undirected graph described by n nodes and an edge list, return how many nodes are reachable from the start node.",
    inputFormat: "n: number, edges: number[][], start: number",
    outputFormat: "number",
    functionName: "countReachableNodes",
    parameters: ["n", "edges", "start"],
    constraints: [
      "0 <= start < n",
      "The graph may be disconnected."
    ],
    hints: [
      "Build an adjacency list.",
      "Use BFS or DFS and count visited nodes."
    ],
    starterCode: buildStarterTemplates("countReachableNodes", ["n", "edges", "start"], "return 0;"),
    publicTests: [
      {
        input: [5, [[0, 1], [1, 2], [3, 4]], 0],
        expected: 3,
        explanation: "Nodes 0, 1, and 2 are reachable."
      },
      {
        input: [4, [[0, 1], [1, 2], [2, 3]], 2],
        expected: 4,
        explanation: "All nodes are connected."
      }
    ],
    hiddenTests: [
      {
        input: [3, [], 1],
        expected: 1
      },
      {
        input: [6, [[0, 1], [0, 2], [3, 4]], 3],
        expected: 2
      }
    ]
  },
  {
    id: "shortest-path-length",
    topic: "graphs and trees",
    difficulty: "medium",
    title: "Shortest Path Length",
    description:
      "Return the minimum number of edges between the start node and target node in an undirected graph, or -1 if no path exists.",
    inputFormat: "n: number, edges: number[][], start: number, target: number",
    outputFormat: "number",
    functionName: "shortestPathLength",
    parameters: ["n", "edges", "start", "target"],
    constraints: [
      "0 <= start, target < n"
    ],
    hints: [
      "BFS gives shortest paths in an unweighted graph.",
      "Store the current distance along with each node."
    ],
    starterCode: buildStarterTemplates("shortestPathLength", ["n", "edges", "start", "target"], "return -1;"),
    publicTests: [
      {
        input: [5, [[0, 1], [1, 2], [2, 4], [1, 3]], 0, 4],
        expected: 3,
        explanation: "0 -> 1 -> 2 -> 4"
      },
      {
        input: [4, [[0, 1], [2, 3]], 0, 3],
        expected: -1,
        explanation: "There is no path between the components."
      }
    ],
    hiddenTests: [
      {
        input: [3, [[0, 1], [1, 2]], 0, 2],
        expected: 2
      },
      {
        input: [3, [], 0, 0],
        expected: 0
      }
    ]
  },
  {
    id: "count-islands",
    topic: "graphs and trees",
    difficulty: "hard",
    title: "Count Islands",
    description:
      "Given a grid of '1's and '0's, return the number of connected islands using up, down, left, and right adjacency.",
    inputFormat: "grid: string[][]",
    outputFormat: "number",
    functionName: "countIslands",
    parameters: ["grid"],
    constraints: [
      "1 <= rows, cols <= 50"
    ],
    hints: [
      "Visit each cell once.",
      "Run DFS or BFS whenever you find an unvisited land cell."
    ],
    starterCode: buildStarterTemplates("countIslands", ["grid"], "return 0;"),
    publicTests: [
      {
        input: [[["1", "1", "0", "0"], ["1", "0", "0", "1"], ["0", "0", "1", "1"]]],
        expected: 2,
        explanation: "There are two disconnected groups of land."
      },
      {
        input: [[["1", "1"], ["1", "1"]]],
        expected: 1,
        explanation: "All land belongs to one island."
      }
    ],
    hiddenTests: [
      {
        input: [[["0", "0"], ["0", "0"]]],
        expected: 0
      },
      {
        input: [[["1", "0", "1"], ["0", "1", "0"], ["1", "0", "1"]]],
        expected: 5
      }
    ]
  }
];

const topicMatches = (challenge, topic) =>
  challenge.topic.toLowerCase() === String(topic || "").trim().toLowerCase();

const difficultyOrder = ["easy", "medium", "hard"];

const sortByDifficultyDistance = (currentDifficulty, candidateDifficulty) =>
  Math.abs(
    difficultyOrder.indexOf(candidateDifficulty) - difficultyOrder.indexOf(currentDifficulty)
  );

const cloneValue = (value) => {
  if (value === undefined) {
    return undefined;
  }

  return JSON.parse(JSON.stringify(value));
};

const normalizeValue = (value) => {
  if (Array.isArray(value)) {
    return value.map(normalizeValue);
  }

  if (value && typeof value === "object") {
    return Object.keys(value)
      .sort()
      .reduce((accumulator, key) => {
        accumulator[key] = normalizeValue(value[key]);
        return accumulator;
      }, {});
  }

  return value;
};

const areEqual = (left, right) =>
  JSON.stringify(normalizeValue(left)) === JSON.stringify(normalizeValue(right));

const formatValue = (value) => {
  if (value === undefined) {
    return "undefined";
  }

  if (typeof value === "string") {
    return value;
  }

  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
};

export const generateCodingChallenge = ({ topic, difficulty }) => {
  const requestedDifficulty = difficultyOrder.includes(difficulty) ? difficulty : "medium";
  const sameTopic = CHALLENGE_BANK.filter((challenge) => topicMatches(challenge, topic));
  const candidates = sameTopic.length ? sameTopic : CHALLENGE_BANK;
  const exactDifficulty = candidates.filter(
    (challenge) => challenge.difficulty === requestedDifficulty
  );

  const pool = exactDifficulty.length
    ? exactDifficulty
    : [...candidates].sort(
        (left, right) =>
          sortByDifficultyDistance(requestedDifficulty, left.difficulty) -
          sortByDifficultyDistance(requestedDifficulty, right.difficulty)
      );

  const picked = pool[Math.floor(Math.random() * pool.length)] || CHALLENGE_BANK[0];

  return {
    ...picked,
    sampleTests: picked.publicTests.map((testCase) => ({
      input: formatValue(testCase.input),
      output: formatValue(testCase.expected),
      explanation: testCase.explanation || ""
    }))
  };
};

export const runJavaScriptSolution = ({ problem, code, runMode = "public" }) => {
  if (!problem?.functionName) {
    return null;
  }

  const publicTests = Array.isArray(problem.publicTests) ? problem.publicTests : [];
  const hiddenTests = Array.isArray(problem.hiddenTests) ? problem.hiddenTests : [];
  const allTests = runMode === "all" ? [...publicTests, ...hiddenTests] : publicTests;

  if (!allTests.length) {
    return null;
  }

  const sandbox = {
    module: { exports: {} },
    exports: {},
    console: {
      log: () => {},
      error: () => {},
      warn: () => {}
    }
  };

  const context = vm.createContext(sandbox);
  const bootScript = new vm.Script(
    `${code}\n;globalThis.__candidate = typeof ${problem.functionName} === "function" ? ${problem.functionName} : (module.exports?.default || module.exports || exports?.default || exports);`
  );

  bootScript.runInContext(context, { timeout: 1000 });

  if (typeof context.__candidate !== "function") {
    throw new Error(
      `No runnable function named "${problem.functionName}" was found. Export that function or declare it by name.`
    );
  }

  const testResults = allTests.map((testCase, index) => {
    const visibility = index < publicTests.length ? "public" : "hidden";
    const args = cloneValue(testCase.input || []);
    context.__args = args;

    try {
      const startedAt = Date.now();
      const runScript = new vm.Script("globalThis.__result = globalThis.__candidate(...globalThis.__args);");
      runScript.runInContext(context, { timeout: 1000 });
      const durationMs = Date.now() - startedAt;
      if (context.__result && typeof context.__result?.then === "function") {
        throw new Error("Async solutions are not supported in the live runner yet.");
      }
      const received = cloneValue(context.__result);
      const passed = areEqual(received, testCase.expected);

      return {
        label: `Test ${index + 1}`,
        visibility,
        passed,
        runtimeMs: durationMs,
        input: formatValue(testCase.input),
        expected: formatValue(testCase.expected),
        received: formatValue(received),
        explanation: testCase.explanation || ""
      };
    } catch (error) {
      return {
        label: `Test ${index + 1}`,
        visibility,
        passed: false,
        runtimeMs: 0,
        input: formatValue(testCase.input),
        expected: formatValue(testCase.expected),
        received: "Runtime error",
        explanation: testCase.explanation || "",
        error: error.message || "Code execution failed."
      };
    } finally {
      delete context.__args;
      delete context.__result;
    }
  });

  const passedTests = testResults.filter((testCase) => testCase.passed).length;
  const totalTests = testResults.length;
  const passRate = totalTests ? Math.round((passedTests / totalTests) * 100) : 0;
  const firstFailure = testResults.find((testCase) => !testCase.passed);
  const issues = [];

  if (firstFailure?.error) {
    issues.push(firstFailure.error);
  }

  if (firstFailure && !firstFailure.error) {
    issues.push(
      `${firstFailure.label} expected ${firstFailure.expected} but received ${firstFailure.received}.`
    );
  }

  if (!issues.length && passRate < 100) {
    issues.push("One or more test cases are still failing.");
  }

  const suggestions = [];

  if (passRate < 100) {
    suggestions.push(
      problem?.hints?.[0] || "Review the core approach and compare it against the failing test."
    );
    suggestions.push(
      problem?.hints?.[1] || "Check edge cases such as empty input, repeated values, or smallest limits."
    );
  } else {
    suggestions.push("Great job. Your solution handled every executed test case.");
    suggestions.push("Try rewriting it once more for readability or better time complexity discussion.");
  }

  return {
    summary:
      passRate === 100
        ? `Passed all ${totalTests} ${runMode === "all" ? "submission" : "public"} tests.`
        : `Passed ${passedTests} of ${totalTests} ${runMode === "all" ? "submission" : "public"} tests.`,
    passed: passRate === 100,
    issues,
    suggestions,
    testResults,
    passedTests,
    totalTests,
    passRate,
    executionMode: "javascript-runner"
  };
};
