/* DSA Illustrated — Problem Content Data
   Loaded by problems.html renderer to inject rich detail into every .prob-section
   Batches of 10; push after each batch.
*/
window.PROB_DATA = {

/* ─────────────────────────────────────────────────────────
   P1  LC#1  Two Sum                                  Easy
───────────────────────────────────────────────────────── */
'p-two-sum': {
  lc:1, asked:'Google · Amazon · Meta · Apple',
  stmt:'Given an integer array <code>nums</code> and an integer <code>target</code>, return <em>indices</em> of the two numbers that add up to <code>target</code>. You may assume exactly one solution exists and you may not use the same element twice.',
  ex:[
    ['nums = [2,7,11,15], target = 9','[0, 1]','nums[0] + nums[1] = 2 + 7 = 9'],
    ['nums = [3,2,4], target = 6','[1, 2]','nums[1] + nums[2] = 2 + 4 = 6'],
    ['nums = [3,3], target = 6','[0, 1]','Two separate indices, same value is allowed']
  ],
  constraints:['2 ≤ nums.length ≤ 10⁴','-10⁹ ≤ nums[i] ≤ 10⁹','-10⁹ ≤ target ≤ 10⁹','Exactly one valid answer exists'],
  approaches:[
    {n:'Brute Force',t:'O(n²)',s:'O(1)',
     steps:['For every pair (i, j) with i < j, check if nums[i] + nums[j] == target','Return [i, j] when found'],
     py:'def twoSum(nums, target):\n    for i in range(len(nums)):\n        for j in range(i+1, len(nums)):\n            if nums[i] + nums[j] == target:\n                return [i, j]',
     js:'function twoSum(nums, target) {\n    for (let i = 0; i < nums.length; i++)\n        for (let j = i+1; j < nums.length; j++)\n            if (nums[i] + nums[j] === target)\n                return [i, j];\n}'},
    {n:'Hash Map',t:'O(n)',s:'O(n)',best:true,
     steps:['Create an empty hash map seen = {} mapping value → index','For each element val at index i, compute complement = target − val','If complement is already in seen, return [seen[complement], i]','Otherwise store seen[val] = i and continue — check before insert to avoid same-element reuse'],
     py:'def twoSum(self, nums, target):\n    seen = {}  # value -> index\n    for i, val in enumerate(nums):\n        comp = target - val\n        if comp in seen:\n            return [seen[comp], i]\n        seen[val] = i  # insert AFTER the check',
     js:'function twoSum(nums, target) {\n    const seen = new Map();\n    for (let i = 0; i < nums.length; i++) {\n        const comp = target - nums[i];\n        if (seen.has(comp))\n            return [seen.get(comp), i];\n        seen.set(nums[i], i);\n    }\n}'}
  ],
  cards:[
    ['🔑','Insert AFTER the check','Store seen[val]=i only after checking for the complement. If target is 6 and nums[0]=3, this prevents incorrectly pairing index 0 with itself.'],
    ['⚠','Return indices, not values','A very common mistake is returning the values [val, complement] instead of the positions [seen[comp], i].'],
    ['✓','Exactly one solution guaranteed','No need to handle "no answer" or multiple pairs. The constraints guarantee exactly one valid pair — return immediately on first match.'],
    ['💭','Hash map = O(1) amortized','Python dict and JS Map give O(1) average-case lookup. This collapses the whole algorithm from O(n²) to a single O(n) pass.']
  ],
  pats:['Hash Map for complement lookup','Single-pass scan with early return','Value → Index mapping','Trade space O(1→n) for time O(n²→n)'],
  rel:[[15,'3Sum','med','Sort + fix one element + two-pointer scan for the other two'],[167,'Two Sum II','easy','Array is sorted → two-pointer works in O(1) space'],[560,'Subarray Sum = K','med','Hash map of prefix sums — same "complement" idea in disguise'],[454,'4Sum II','med','Hash map A+B sums, then look up -(C+D)']]
},

/* ─────────────────────────────────────────────────────────
   P2  LC#121  Best Time to Buy & Sell Stock           Easy
───────────────────────────────────────────────────────── */
'p-best-stock': {
  lc:121, asked:'Amazon · Google · Microsoft · Adobe',
  stmt:'Given an array <code>prices</code> where <code>prices[i]</code> is the price of a stock on day <code>i</code>, find the maximum profit from buying on one day and selling on a later day. Return 0 if no profit is possible.',
  ex:[
    ['prices = [7,1,5,3,6,4]','5','Buy at 1 (day 1), sell at 6 (day 4). Profit = 6 − 1 = 5'],
    ['prices = [7,6,4,3,1]','0','Prices only decrease — no transaction is profitable']
  ],
  constraints:['1 ≤ prices.length ≤ 10⁵','0 ≤ prices[i] ≤ 10⁴'],
  approaches:[
    {n:'Brute Force',t:'O(n²)',s:'O(1)',
     steps:['Try every buy-sell pair (i, j) with i < j','Track maximum of prices[j] − prices[i]']},
    {n:'Sliding Min + Max Profit',t:'O(n)',s:'O(1)',best:true,
     steps:['Track minPrice seen so far (the best buy opportunity)','At each day, compute profit = prices[i] − minPrice','Update maxProfit if this profit is larger','Update minPrice if prices[i] is smaller'],
     py:'def maxProfit(prices):\n    min_price = float("inf")\n    max_profit = 0\n    for price in prices:\n        if price < min_price:\n            min_price = price\n        elif price - min_price > max_profit:\n            max_profit = price - min_price\n    return max_profit',
     js:'function maxProfit(prices) {\n    let minPrice = Infinity, maxProfit = 0;\n    for (const price of prices) {\n        if (price < minPrice) minPrice = price;\n        else if (price - minPrice > maxProfit)\n            maxProfit = price - minPrice;\n    }\n    return maxProfit;\n}'}
  ],
  cards:[
    ['📉','Track the running minimum','You can always pretend you bought at the lowest price seen so far. The optimal buy point is whatever minimum was seen before the current day.'],
    ['🚫','Can\'t sell before you buy','Indices must satisfy buy_day < sell_day. The running-minimum approach enforces this automatically — we\'ve only seen past prices.'],
    ['↔','One pass suffices','A single left-to-right sweep captures both the cheapest buy and the most profitable sell in O(n) time and O(1) space.'],
    ['🔄','Kadane\'s connection','This is equivalent to Kadane\'s algorithm on the difference array. Each diff[i] = prices[i] − prices[i-1]; max subarray sum of diffs = max profit.']
  ],
  pats:['Sliding window minimum','Greedy running-best update','Single-pass scan'],
  rel:[[122,'Best Time II (multi-buy)','med','Greedy: sum all positive diffs'],[123,'Best Time III (k=2)','hard','DP with at most 2 transactions'],[188,'Best Time IV (k=K)','hard','DP generalized to K transactions'],[309,'Stock with Cooldown','med','DP with cooldown state']]
},

/* ─────────────────────────────────────────────────────────
   P3  LC#20  Valid Parentheses                        Easy
───────────────────────────────────────────────────────── */
'p-valid-parens': {
  lc:20, asked:'Google · Facebook · Amazon · Bloomberg',
  stmt:'Given a string <code>s</code> containing only the characters <code>(</code>, <code>)</code>, <code>{</code>, <code>}</code>, <code>[</code>, <code>]</code>, determine if the input string is valid. A string is valid if every open bracket is closed by the same type of bracket in the correct order.',
  ex:[
    ['s = "()"','true','Single matched pair'],
    ['s = "()[]{}"','true','Three consecutive matched pairs'],
    ['s = "(]"','false','Wrong closing bracket type'],
    ['s = "([)]"','false','Interleaved — inner pair [) does not match']
  ],
  constraints:['1 ≤ s.length ≤ 10⁴','s consists of parentheses characters only'],
  approaches:[
    {n:'Stack',t:'O(n)',s:'O(n)',best:true,
     steps:['Push every opening bracket ( { [ onto the stack','For every closing bracket, check if the stack is non-empty and its top is the matching opener','If mismatch or stack is empty on close → return false','After the loop, the string is valid only if the stack is empty (no unmatched openers)'],
     py:'def isValid(s):\n    stack = []\n    match = {")": "(", "}": "{", "]": "["}\n    for ch in s:\n        if ch in match:\n            if not stack or stack[-1] != match[ch]:\n                return False\n            stack.pop()\n        else:\n            stack.append(ch)\n    return len(stack) == 0',
     js:'function isValid(s) {\n    const stack = [];\n    const match = { ")":"(", "}":"{", "]":"[" };\n    for (const ch of s) {\n        if (match[ch]) {\n            if (!stack.length || stack.at(-1) !== match[ch])\n                return false;\n            stack.pop();\n        } else {\n            stack.push(ch);\n        }\n    }\n    return stack.length === 0;\n}'}
  ],
  cards:[
    ['📚','Stack is the perfect data structure','The Last-In-First-Out property of a stack mirrors the nesting structure of brackets — the most recently opened bracket must be the next one closed.'],
    ['🗺','Build a match map for O(1) lookup','Storing {")": "(", ...} lets you check any closing bracket\'s expected opener in O(1) instead of three separate if-statements.'],
    ['✓','Empty stack = valid at the end','An unmatched opener (e.g., "((") leaves items on the stack. Always check stack.length === 0 at the end — don\'t just check for false during the loop.'],
    ['⚡','Early exit saves time','As soon as a mismatch is found, return false immediately. No need to continue scanning the rest of the string.']
  ],
  pats:['Stack for matching/nesting problems','LIFO property mirrors bracket nesting','Early termination on mismatch'],
  rel:[[22,'Generate Parentheses','med','Backtracking to build all valid strings'],[32,'Longest Valid Parens','hard','DP or stack to track longest valid run'],[921,'Min Add to Make Valid','med','Greedy: count unmatched openers & closers'],[1249,'Min Remove to Make Valid','med','Stack-based removal of invalid chars']]
},

/* ─────────────────────────────────────────────────────────
   P4  LC#3  Longest Substring Without Repeating       Med
───────────────────────────────────────────────────────── */
'p-longest-substr': {
  lc:3, asked:'Amazon · Google · Microsoft · Bloomberg',
  stmt:'Given a string <code>s</code>, find the length of the longest substring that contains no repeating characters.',
  ex:[
    ['s = "abcabcbb"','3','"abc" has length 3'],
    ['s = "bbbbb"','1','"b" — all chars the same'],
    ['s = "pwwkew"','3','"wke" has length 3']
  ],
  constraints:['0 ≤ s.length ≤ 5 × 10⁴','s consists of English letters, digits, symbols and spaces'],
  approaches:[
    {n:'Brute Force',t:'O(n²)',s:'O(n)',
     steps:['For every start index i, expand right while no duplicate','Track maximum window length seen']},
    {n:'Sliding Window + Set',t:'O(n)',s:'O(min(n,k))',best:true,
     steps:['Maintain a window [left, right] and a set of characters in the window','Expand right: if s[right] not in set, add it and update maxLen','Shrink left: if s[right] already in set, remove s[left] from set and advance left','Repeat until right reaches the end'],
     py:'def lengthOfLongestSubstring(s):\n    seen = set()\n    left = 0\n    max_len = 0\n    for right in range(len(s)):\n        while s[right] in seen:\n            seen.remove(s[left])\n            left += 1\n        seen.add(s[right])\n        max_len = max(max_len, right - left + 1)\n    return max_len',
     js:'function lengthOfLongestSubstring(s) {\n    const seen = new Set();\n    let left = 0, maxLen = 0;\n    for (let right = 0; right < s.length; right++) {\n        while (seen.has(s[right])) {\n            seen.delete(s[left++]);\n        }\n        seen.add(s[right]);\n        maxLen = Math.max(maxLen, right - left + 1);\n    }\n    return maxLen;\n}'}
  ],
  cards:[
    ['🪟','Two-pointer sliding window','left and right define a window that always holds a valid (duplicate-free) substring. Expand right greedily; shrink left only when a duplicate appears.'],
    ['⚡','Optimize with a char→index map','Instead of shrinking one step at a time, store the last-seen index of each char and jump left directly to lastSeen[char]+1 — turns the inner while into O(1).'],
    ['📏','Window size = right − left + 1','Remember the +1: a window from index 2 to 5 has 4 characters, not 3.'],
    ['🔤','k = alphabet size','Space is O(min(n, k)) where k is the character-set size (26 for lowercase, 128 for ASCII, etc.).']
  ],
  pats:['Sliding window with set','Shrink-from-left on violation','Two-pointer expanding window'],
  rel:[[159,'Longest Substr with at Most 2 Distinct','med','Sliding window, allow 2 distinct chars'],[340,'Longest Substr with at Most K Distinct','med','Generalize to K distinct'],[424,'Longest Repeating Char Replacement','med','Sliding window with frequency count'],[438,'Find All Anagrams in String','med','Fixed-size sliding window']]
},

/* ─────────────────────────────────────────────────────────
   P5  LC#70  Climbing Stairs                          Easy
───────────────────────────────────────────────────────── */
'p-climbing-stairs': {
  lc:70, asked:'Amazon · Apple · Google · Adobe',
  stmt:'You are climbing a staircase. It takes <code>n</code> steps to reach the top. Each time you can either climb 1 or 2 steps. In how many distinct ways can you climb to the top?',
  ex:[
    ['n = 2','2','1+1, or 2'],
    ['n = 3','3','1+1+1, 1+2, or 2+1'],
    ['n = 5','8','Fibonacci(7) = 8 — follows Fibonacci sequence']
  ],
  constraints:['1 ≤ n ≤ 45'],
  approaches:[
    {n:'Naive Recursion',t:'O(2ⁿ)',s:'O(n)',
     steps:['climbStairs(n) = climbStairs(n-1) + climbStairs(n-2)','Massive recomputation — exponential time']},
    {n:'DP (iterative)',t:'O(n)',s:'O(1)',best:true,
     steps:['Observe: ways(n) = ways(n-1) + ways(n-2) — the classic Fibonacci recurrence','Base cases: ways(1)=1, ways(2)=2','Iterate from 3 to n keeping only the last two values (O(1) space)'],
     py:'def climbStairs(n):\n    if n <= 2:\n        return n\n    prev2, prev1 = 1, 2\n    for _ in range(3, n + 1):\n        prev2, prev1 = prev1, prev2 + prev1\n    return prev1',
     js:'function climbStairs(n) {\n    if (n <= 2) return n;\n    let prev2 = 1, prev1 = 2;\n    for (let i = 3; i <= n; i++) {\n        [prev2, prev1] = [prev1, prev2 + prev1];\n    }\n    return prev1;\n}'}
  ],
  cards:[
    ['🔢','This IS Fibonacci','ways(n) = fib(n+1). The pattern emerges because from step n you could have come from n-1 (one step) or n-2 (two steps) — same recurrence as Fibonacci.'],
    ['♻','Rolling variables beat an array','You only ever need the previous two values. A dp[] array of size n wastes space — two variables prev1 and prev2 suffice for O(1) space.'],
    ['🌳','Overlapping subproblems','Naive recursion recomputes climbStairs(3) exponentially many times. This is the defining property of DP problems: optimal substructure + overlapping subproblems.'],
    ['📈','Generalisation: k steps','If you can take 1..k steps, the recurrence becomes ways(n) = sum of ways(n-1) through ways(n-k). Same idea, larger window.']
  ],
  pats:['1D dynamic programming','Fibonacci recurrence','Rolling variable optimization','Overlapping subproblems → memoize or iterate'],
  rel:[[198,'House Robber','med','Non-adjacent DP: rob(n)=max(rob(n-2)+val, rob(n-1))'],[746,'Min Cost Climbing Stairs','easy','DP with cost: choose cheaper step'],[91,'Decode Ways','med','DP on valid character groupings'],[509,'Fibonacci Number','easy','Direct Fibonacci formulation']]
},

/* ─────────────────────────────────────────────────────────
   P6  LC#322  Coin Change                             Med
───────────────────────────────────────────────────────── */
'p-coin-change': {
  lc:322, asked:'Google · Amazon · Meta · Microsoft',
  stmt:'Given an array of coin denominations <code>coins</code> and a total amount <code>amount</code>, return the <em>fewest number of coins</em> needed to make up that amount. If it is impossible, return <code>-1</code>. You have infinite copies of each coin.',
  ex:[
    ['coins = [1,5,10,25], amount = 30','2','25 + 5 = 30 (2 coins)'],
    ['coins = [1,2,5], amount = 11','3','5+5+1 = 11'],
    ['coins = [2], amount = 3','-1','Cannot make 3 with only 2-denomination coins']
  ],
  constraints:['1 ≤ coins.length ≤ 12','1 ≤ coins[i] ≤ 2³¹ − 1','0 ≤ amount ≤ 10⁴'],
  approaches:[
    {n:'Greedy',t:'O(n)',s:'O(1)',
     steps:['Always pick the largest coin ≤ remaining amount','FAILS for some inputs — e.g., coins=[1,3,4], amount=6: greedy gives 4+1+1=3 coins but optimal is 3+3=2 coins']},
    {n:'Bottom-Up DP',t:'O(n×amount)',s:'O(amount)',best:true,
     steps:['Create dp[] of size amount+1 initialised to Infinity. dp[0] = 0','For every sub-amount from 1 to amount, try every coin','dp[a] = min(dp[a], dp[a - coin] + 1) for each coin ≤ a','Answer is dp[amount] if not Infinity, else -1'],
     py:'def coinChange(coins, amount):\n    dp = [float("inf")] * (amount + 1)\n    dp[0] = 0\n    for a in range(1, amount + 1):\n        for coin in coins:\n            if coin <= a:\n                dp[a] = min(dp[a], dp[a - coin] + 1)\n    return dp[amount] if dp[amount] != float("inf") else -1',
     js:'function coinChange(coins, amount) {\n    const dp = new Array(amount + 1).fill(Infinity);\n    dp[0] = 0;\n    for (let a = 1; a <= amount; a++)\n        for (const coin of coins)\n            if (coin <= a)\n                dp[a] = Math.min(dp[a], dp[a - coin] + 1);\n    return dp[amount] === Infinity ? -1 : dp[amount];\n}'}
  ],
  cards:[
    ['🚫','Greedy fails — always use DP','For denominations that aren\'t "canonical" (like US coins), greedy picks a large coin and misses a better combination. DP exhausts all possibilities.'],
    ['∞','Initialize to Infinity, base 0','dp[0]=0 seeds the DP (zero coins to make 0). Infinity means "not yet reachable." Any amount that stays Infinity is truly unreachable.'],
    ['🔄','Unbounded knapsack pattern','Each coin can be reused — this is the Unbounded Knapsack variant. Compare to Coin Change II (which counts combinations, not min coins).'],
    ['📊','Time = O(S × n)','S = amount, n = number of coins. The double loop visits each (amount, coin) pair once. Typical input fits in milliseconds.']
  ],
  pats:['Bottom-up 1D DP','Unbounded knapsack','Min-cost reachability','Greedy fails → think DP'],
  rel:[[518,'Coin Change II','med','Count # of combinations (not min coins)'],[279,'Perfect Squares','med','Same DP pattern, coins are perfect squares'],[983,'Minimum Cost for Tickets','med','Similar unbounded DP on days'],[322,'Coin Change','med','This problem']]
},

/* ─────────────────────────────────────────────────────────
   P7  LC#56  Merge Intervals                          Med
───────────────────────────────────────────────────────── */
'p-merge-intervals': {
  lc:56, asked:'Google · Meta · Microsoft · Uber',
  stmt:'Given an array of <code>intervals</code> where <code>intervals[i] = [start, end]</code>, merge all overlapping intervals and return an array of the non-overlapping intervals that cover all the intervals in the input.',
  ex:[
    ['intervals = [[1,3],[2,6],[8,10],[15,18]]','[[1,6],[8,10],[15,18]]','[1,3] and [2,6] overlap → merged to [1,6]'],
    ['intervals = [[1,4],[4,5]]','[[1,5]]','Touching at 4 counts as overlapping']
  ],
  constraints:['1 ≤ intervals.length ≤ 10⁴','intervals[i].length == 2','0 ≤ start ≤ end ≤ 10⁴'],
  approaches:[
    {n:'Sort + Linear Merge',t:'O(n log n)',s:'O(n)',best:true,
     steps:['Sort intervals by start time — O(n log n)','Initialize result with the first interval','For each subsequent interval, compare its start to the last merged interval\'s end','If start ≤ last.end → overlapping: extend last.end = max(last.end, current.end)','If start > last.end → no overlap: append current interval to result'],
     py:'def merge(intervals):\n    intervals.sort(key=lambda x: x[0])\n    merged = [intervals[0]]\n    for start, end in intervals[1:]:\n        if start <= merged[-1][1]:\n            merged[-1][1] = max(merged[-1][1], end)\n        else:\n            merged.append([start, end])\n    return merged',
     js:'function merge(intervals) {\n    intervals.sort((a, b) => a[0] - b[0]);\n    const merged = [intervals[0]];\n    for (let i = 1; i < intervals.length; i++) {\n        const [start, end] = intervals[i];\n        const last = merged.at(-1);\n        if (start <= last[1])\n            last[1] = Math.max(last[1], end);\n        else\n            merged.push([start, end]);\n    }\n    return merged;\n}'}
  ],
  cards:[
    ['🔀','Sort first — it\'s the key insight','After sorting by start, all intervals that could possibly overlap are adjacent. Without sorting, you\'d need O(n²) comparisons.'],
    ['📏','Overlap condition: start ≤ prev.end','Two intervals [a,b] and [c,d] with c≥a overlap if and only if c ≤ b. Use max(b, d) as the merged end because the new interval might fully contain the previous one.'],
    ['🎯','Merge in-place on the result list','You can extend merged[-1][1] directly instead of creating new arrays. Modifying the last element of the result avoids extra allocations.'],
    ['🔗','Application: meeting rooms','A direct extension: sort by start, check if any interval\'s start < previous end → rooms overlap. Merge Intervals is the backbone of many scheduling problems.']
  ],
  pats:['Sort then scan','Interval overlap detection','Greedy merge from left'],
  rel:[[57,'Insert Interval','med','Insert + re-merge a new interval into sorted list'],[252,'Meeting Rooms','easy','Can all meetings be attended? (overlap check)'],[253,'Meeting Rooms II','med','Min rooms needed (heap or sweep line)'],[435,'Non-overlapping Intervals','med','Remove fewest intervals to eliminate all overlaps']]
},

/* ─────────────────────────────────────────────────────────
   P8  LC#200  Number of Islands                       Med
───────────────────────────────────────────────────────── */
'p-num-islands': {
  lc:200, asked:'Amazon · Google · Meta · Bloomberg',
  stmt:'Given an <code>m × n</code> grid of characters where <code>"1"</code> = land and <code>"0"</code> = water, return the number of islands. An island is surrounded by water and formed by connecting adjacent lands horizontally or vertically.',
  ex:[
    ['grid = [["1","1","1"],["0","1","0"],["1","1","1"]]','1','All land cells connect to form one island'],
    ['grid = [["1","1","0","0"],["1","1","0","0"],["0","0","1","0"],["0","0","0","1"]]','3','Three separate land clusters']
  ],
  constraints:['m == grid.length, n == grid[i].length','1 ≤ m, n ≤ 300','grid[i][j] is "0" or "1"'],
  approaches:[
    {n:'BFS Flood Fill',t:'O(m×n)',s:'O(min(m,n))',
     steps:['For each unvisited "1", increment the island count and run BFS','BFS floods the entire connected component, marking cells as "0" (visited)','Each cell is processed at most once']},
    {n:'DFS Flood Fill',t:'O(m×n)',s:'O(m×n)',best:true,
     steps:['Scan the grid for any "1" that hasn\'t been visited','When found, increment island count and call DFS to mark all connected land','DFS explores all 4 directions recursively, marking cells "0" to avoid revisiting'],
     py:'def numIslands(grid):\n    if not grid:\n        return 0\n    rows, cols = len(grid), len(grid[0])\n    count = 0\n\n    def dfs(r, c):\n        if r < 0 or r >= rows or c < 0 or c >= cols:\n            return\n        if grid[r][c] != "1":\n            return\n        grid[r][c] = "0"  # mark visited\n        dfs(r+1, c); dfs(r-1, c)\n        dfs(r, c+1); dfs(r, c-1)\n\n    for r in range(rows):\n        for c in range(cols):\n            if grid[r][c] == "1":\n                count += 1\n                dfs(r, c)\n    return count',
     js:'function numIslands(grid) {\n    const rows = grid.length, cols = grid[0].length;\n    let count = 0;\n    function dfs(r, c) {\n        if (r < 0 || r >= rows || c < 0 || c >= cols) return;\n        if (grid[r][c] !== "1") return;\n        grid[r][c] = "0";\n        dfs(r+1,c); dfs(r-1,c); dfs(r,c+1); dfs(r,c-1);\n    }\n    for (let r = 0; r < rows; r++)\n        for (let c = 0; c < cols; c++)\n            if (grid[r][c] === "1") { count++; dfs(r, c); }\n    return count;\n}'}
  ],
  cards:[
    ['🌊','Flood fill is the core idea','DFS/BFS "floods" each island by marking visited land as water ("0"). This prevents double-counting a connected component.'],
    ['♻','Mutate the grid to avoid a visited set','Changing "1" → "0" directly in the grid avoids allocating a separate boolean visited matrix. Restore after if you must preserve input.'],
    ['🔄','DFS vs BFS — same complexity','Both visit each cell once: O(m×n) time. DFS uses recursion stack space O(m×n) in worst case; BFS queue is O(min(m,n)) for a near-diagonal island.'],
    ['🗺','Union-Find is the third option','A Union-Find (disjoint set) structure can also solve this in near-O(m×n) and is useful when the grid is streamed or updated dynamically.']
  ],
  pats:['DFS/BFS flood fill on grid','Connected components in implicit graph','Mark-visited-in-place'],
  rel:[[695,'Max Area of Island','med','Same DFS but track and maximize area'],[994,'Rotting Oranges','med','Multi-source BFS from all "2" cells'],[1020,'Number of Enclaves','med','Count land not reachable from border'],[130,'Surrounded Regions','med','Flip "O" surrounded by "X"']]
},

/* ─────────────────────────────────────────────────────────
   P9  LC#509  Fibonacci Number                        Easy
───────────────────────────────────────────────────────── */
'p-fibonacci': {
  lc:509,
  stmt:'The Fibonacci numbers, commonly denoted F(n), form a sequence such that <code>F(0)=0, F(1)=1</code>, and <code>F(n) = F(n-1) + F(n-2)</code> for n > 1. Given n, return F(n).',
  ex:[
    ['n = 0','0','F(0) = 0 by definition'],
    ['n = 4','3','F(4) = F(3)+F(2) = 2+1 = 3'],
    ['n = 10','55','']
  ],
  constraints:['0 ≤ n ≤ 30'],
  approaches:[
    {n:'Naive Recursion',t:'O(2ⁿ)',s:'O(n)',
     steps:['return fib(n-1) + fib(n-2) — exponential due to recomputation']},
    {n:'Memoization (Top-Down)',t:'O(n)',s:'O(n)',
     steps:['Cache computed fib values in a dict','On each call, check cache before recursing']},
    {n:'Iterative (Bottom-Up)',t:'O(n)',s:'O(1)',best:true,
     steps:['Start with a=0, b=1 (F(0), F(1))','Iterate n times: a, b = b, a+b','Return a after n iterations'],
     py:'def fib(n):\n    a, b = 0, 1\n    for _ in range(n):\n        a, b = b, a + b\n    return a',
     js:'function fib(n) {\n    let a = 0, b = 1;\n    for (let i = 0; i < n; i++)\n        [a, b] = [b, a + b];\n    return a;\n}'}
  ],
  cards:[
    ['♟','Exponential → Linear with DP','Naive recursion recomputes fib(2) exponentially many times. Memoization caches results; iteration avoids the call stack entirely.'],
    ['🔄','Classic overlapping subproblems','Fibonacci is THE canonical example of overlapping subproblems — it appears in every DP introduction because the speedup (2ⁿ → n) is dramatic and easy to visualize.'],
    ['🔢','Matrix exponentiation → O(log n)','For huge n, matrix [1,1;1,0]^n yields F(n) in O(log n) using fast matrix exponentiation. Rarely needed in interviews.'],
    ['🪄','Golden ratio formula (Binet)','F(n) = round(φⁿ/√5) where φ=(1+√5)/2. Exact for small n but floating-point errors make it unreliable for n > 70.']
  ],
  pats:['Bottom-up DP with rolling variables','Fibonacci recurrence','Overlapping subproblems → memoize'],
  rel:[[70,'Climbing Stairs','easy','fib(n+1): same recurrence'],[746,'Min Cost Climbing Stairs','easy','DP with cost array'],[1137,'N-th Tribonacci Number','easy','3-way Fibonacci'],[198,'House Robber','med','Non-adjacent DP, similar structure']]
},

/* ─────────────────────────────────────────────────────────
   P10  LC#198  House Robber                           Med
───────────────────────────────────────────────────────── */
'p-house-robber': {
  lc:198, asked:'Airbnb · Amazon · Google · LinkedIn',
  stmt:'You are a robber planning to rob houses along a street. Each house has a certain amount of money. You cannot rob two adjacent houses (the alarm will trigger). Given an integer array <code>nums</code> where <code>nums[i]</code> is the money in house i, return the maximum amount you can rob tonight.',
  ex:[
    ['nums = [1,2,3,1]','4','Rob house 1 (1) + house 3 (3) = 4'],
    ['nums = [2,7,9,3,1]','12','Rob house 1 (2) + house 3 (9) + house 5 (1) = 12']
  ],
  constraints:['1 ≤ nums.length ≤ 100','0 ≤ nums[i] ≤ 400'],
  approaches:[
    {n:'Naive Recursion',t:'O(2ⁿ)',s:'O(n)',
     steps:['rob(i) = max(nums[i] + rob(i+2), rob(i+1))','Recomputes overlapping subproblems exponentially']},
    {n:'DP (space-optimised)',t:'O(n)',s:'O(1)',best:true,
     steps:['rob1 = best loot excluding current house, rob2 = best loot including current','For each house: new = max(rob1 + nums[i], rob2)','Slide: rob1 = rob2, rob2 = new','Return rob2 at the end'],
     py:'def rob(nums):\n    rob1, rob2 = 0, 0  # rob1=prev-prev, rob2=prev\n    for n in nums:\n        new = max(rob1 + n, rob2)\n        rob1, rob2 = rob2, new\n    return rob2',
     js:'function rob(nums) {\n    let rob1 = 0, rob2 = 0;\n    for (const n of nums) {\n        const newRob = Math.max(rob1 + n, rob2);\n        rob1 = rob2;\n        rob2 = newRob;\n    }\n    return rob2;\n}'}
  ],
  cards:[
    ['🏠','Two choices at each house','Either rob house i (and get nums[i] + best-up-to-i-2) or skip it (take best-up-to-i-1). The recurrence: dp[i] = max(dp[i-2]+nums[i], dp[i-1]).'],
    ['💡','Rolling variables: O(1) space','You never need dp[i-3] or earlier. Two variables (rob1, rob2) track the last two dp states and slide forward — same trick as iterative Fibonacci.'],
    ['🔄','Basis for House Robber II & III','This linear DP extends to circular houses (LC#213 — split into two linear problems) and binary trees (LC#337 — DFS returning (rob, skip) pairs).'],
    ['🎯','Greedy fails here','Greedy "always take the largest available" doesn\'t work: [2,1,1,2] → greedy might pick 2+1=3, but optimal is 2+2=4. DP is required.']
  ],
  pats:['1D non-adjacent DP','Rolling 2-variable DP','Optimal substructure with skip-one constraint'],
  rel:[[213,'House Robber II','med','Houses in a circle — split into two linear DPs'],[337,'House Robber III','med','Houses on a binary tree — DFS DP'],[198,'House Robber','med','This problem'],[740,'Delete and Earn','med','Map to house robber on value frequency']]
}

}; // end PROB_DATA
