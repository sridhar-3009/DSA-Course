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


/* ─────────────────────────────────────────────────────────
   P11  LC#78  Subsets                                 Med
───────────────────────────────────────────────────────── */
,'p-subsets': {
  lc:78, asked:'Facebook · Amazon · Microsoft',
  stmt:'Given an integer array <code>nums</code> of unique elements, return <em>all possible subsets</em> (the power set). The solution set must not contain duplicate subsets. Return the solution in any order.',
  ex:[
    ['nums = [1,2,3]','[[], [1], [2], [1,2], [3], [1,3], [2,3], [1,2,3]]','2³ = 8 subsets total'],
    ['nums = [0]','[[], [0]]','Two subsets: empty set and {0}']
  ],
  constraints:['1 ≤ nums.length ≤ 10','−10 ≤ nums[i] ≤ 10','All nums[i] are unique'],
  approaches:[
    {n:'Bit Masking',t:'O(n×2ⁿ)',s:'O(n×2ⁿ)',
     steps:['Each number from 0 to 2ⁿ−1 represents a bitmask where bit i = include nums[i]','Loop over all 2ⁿ masks and build each subset from set bits']},
    {n:'Backtracking',t:'O(n×2ⁿ)',s:'O(n)',best:true,
     steps:['Start with an empty current subset and index=0','At each step, choose to include nums[index] (recurse) or not','After recursing in, pop nums[index] to backtrack (exclude path)','Base case: add a copy of current to result whenever we advance index'],
     py:'def subsets(nums):\n    result, current = [], []\n    def backtrack(idx):\n        result.append(current[:])  # snapshot — every state is a valid subset\n        for i in range(idx, len(nums)):\n            current.append(nums[i])\n            backtrack(i + 1)\n            current.pop()  # undo / backtrack\n    backtrack(0)\n    return result',
     js:'function subsets(nums) {\n    const result = [], current = [];\n    function backtrack(idx) {\n        result.push([...current]);\n        for (let i = idx; i < nums.length; i++) {\n            current.push(nums[i]);\n            backtrack(i + 1);\n            current.pop();\n        }\n    }\n    backtrack(0);\n    return result;\n}'}
  ],
  cards:[
    ['🌳','Decision tree: include or skip','At each element, branch into two choices. The recursion tree has 2ⁿ leaves — one per subset. Backtracking explores all branches without missing any.'],
    ['📸','Copy before appending','result.push(current[:]) (Python) or result.push([...current]) (JS) — always snapshot the current array. Pushing the reference and mutating it later gives wrong results.'],
    ['↩','Backtrack = undo last choice','After the recursive call with nums[i] included, pop it off current. This restores state so the next iteration can try the next element without nums[i].'],
    ['🔢','2ⁿ subsets for n unique elements','The power set of {a,b,c} has 2³=8 members including the empty set. Time and space are both O(n × 2ⁿ) — unavoidable since you must output every subset.']
  ],
  pats:['Backtracking / decision tree','Include-or-skip branching','Power set enumeration'],
  rel:[[90,'Subsets II','med','Same but with duplicates — sort + skip dups'],[46,'Permutations','med','All orderings instead of all subsets'],[77,'Combinations','med','Choose exactly k elements'],[39,'Combination Sum','med','Subsets summing to target, elements reusable']]
},

/* ─────────────────────────────────────────────────────────
   P12  LC#46  Permutations                            Med
───────────────────────────────────────────────────────── */
'p-permutations': {
  lc:46, asked:'Microsoft · Facebook · Amazon',
  stmt:'Given an array <code>nums</code> of distinct integers, return all possible permutations in any order.',
  ex:[
    ['nums = [1,2,3]','[[1,2,3],[1,3,2],[2,1,3],[2,3,1],[3,1,2],[3,2,1]]','3! = 6 permutations'],
    ['nums = [0,1]','[[0,1],[1,0]]','2! = 2 permutations']
  ],
  constraints:['1 ≤ nums.length ≤ 6','−10 ≤ nums[i] ≤ 10','All integers in nums are unique'],
  approaches:[
    {n:'Backtracking with used[]',t:'O(n×n!)',s:'O(n)',best:true,
     steps:['Track which elements have been placed using a boolean used[] array','At each recursion level, try every unused element as the next position','When current length equals n, record the permutation','Undo: mark used[i]=false after the recursive call'],
     py:'def permute(nums):\n    result, current, used = [], [], [False]*len(nums)\n    def backtrack():\n        if len(current) == len(nums):\n            result.append(current[:])\n            return\n        for i, n in enumerate(nums):\n            if not used[i]:\n                used[i] = True\n                current.append(n)\n                backtrack()\n                current.pop()\n                used[i] = False\n    backtrack()\n    return result',
     js:'function permute(nums) {\n    const result = [], current = [], used = new Array(nums.length).fill(false);\n    function backtrack() {\n        if (current.length === nums.length) {\n            result.push([...current]); return;\n        }\n        for (let i = 0; i < nums.length; i++) {\n            if (!used[i]) {\n                used[i] = true;\n                current.push(nums[i]);\n                backtrack();\n                current.pop();\n                used[i] = false;\n            }\n        }\n    }\n    backtrack();\n    return result;\n}'}
  ],
  cards:[
    ['🔄','n! permutations for n elements','3 elements → 6, 6 elements → 720. Output size itself is O(n × n!), which is the minimum time needed just to write the answer.'],
    ['✅','used[] prevents re-picking','Unlike subsets (where each element is optional), permutations use every element exactly once. A boolean array tracks what\'s in the current partial permutation.'],
    ['↩','Backtrack restores used[]','After recursing with element i, set used[i]=false and pop current. This is the fundamental backtracking "undo" step — state before the choice is restored exactly.'],
    ['🔀','Alternative: swap-in-place','Swap nums[start] with nums[i], recurse on start+1, swap back. Avoids the used[] array but scrambles the input order — harder to reason about.']
  ],
  pats:['Backtracking with used-set','State restoration after recursion','n! enumeration'],
  rel:[[47,'Permutations II','med','Permutations with duplicates — sort + skip'],[31,'Next Permutation','med','Find the lexicographically next arrangement'],[60,'Permutation Sequence','hard','Find the k-th permutation directly'],[78,'Subsets','med','Pick any subset rather than all elements']]
},

/* ─────────────────────────────────────────────────────────
   P13  LC#704  Binary Search                          Easy
───────────────────────────────────────────────────────── */
'p-binary-search': {
  lc:704, asked:'Google · Amazon · Bloomberg',
  stmt:'Given an array of integers <code>nums</code> sorted in ascending order and an integer <code>target</code>, write a function to search for <code>target</code> in <code>nums</code>. Return the index if found, otherwise return <code>-1</code>.',
  ex:[
    ['nums = [-1,0,3,5,9,12], target = 9','4','9 is at index 4'],
    ['nums = [-1,0,3,5,9,12], target = 2','-1','2 is not in the array']
  ],
  constraints:['1 ≤ nums.length ≤ 10⁴','−10⁴ ≤ nums[i], target ≤ 10⁴','All values in nums are unique','nums is sorted in ascending order'],
  approaches:[
    {n:'Linear Scan',t:'O(n)',s:'O(1)',
     steps:['Check every element — works but ignores the sorted property']},
    {n:'Binary Search',t:'O(log n)',s:'O(1)',best:true,
     steps:['Set left=0, right=n−1','While left ≤ right: compute mid = left + (right-left)//2 (avoids overflow)','If nums[mid] == target, return mid','If nums[mid] < target, search right half: left = mid+1','If nums[mid] > target, search left half: right = mid−1','Return -1 if loop ends without finding target'],
     py:'def search(nums, target):\n    left, right = 0, len(nums) - 1\n    while left <= right:\n        mid = left + (right - left) // 2\n        if nums[mid] == target:\n            return mid\n        elif nums[mid] < target:\n            left = mid + 1\n        else:\n            right = mid - 1\n    return -1',
     js:'function search(nums, target) {\n    let left = 0, right = nums.length - 1;\n    while (left <= right) {\n        const mid = left + Math.floor((right - left) / 2);\n        if (nums[mid] === target) return mid;\n        else if (nums[mid] < target) left = mid + 1;\n        else right = mid - 1;\n    }\n    return -1;\n}'}
  ],
  cards:[
    ['➗','Halves the search space every step','Each iteration eliminates half the remaining elements. On 1 billion elements, binary search takes at most 30 comparisons. Linear scan would need 1 billion.'],
    ['⚠','mid = left + (right−left)//2 avoids overflow','(left + right) // 2 overflows in languages where integers are 32-bit (C++, Java). The safe formula is standard practice even in Python for consistency.'],
    ['🔒','Invariant: target is in [left, right]','The loop maintains this invariant at all times. When left > right, the search space is empty and the target is absent.'],
    ['📐','The template has many variants','Same skeleton → find first/last occurrence, find insertion point (bisect_left), search rotated array, find answer in monotonic function space.']
  ],
  pats:['Binary search on sorted array','Eliminate-half invariant','Two-pointer convergence'],
  rel:[[33,'Search in Rotated Sorted Array','med','Binary search with pivot detection'],[153,'Find Min in Rotated Sorted Array','med','Binary search on unsorted-looking array'],[34,'First and Last Position','med','Two binary searches: first and last index'],[875,'Koko Eating Bananas','med','Binary search on answer space']]
},

/* ─────────────────────────────────────────────────────────
   P14  LC#53  Maximum Subarray (Kadane's)             Med
───────────────────────────────────────────────────────── */
'p-max-subarray': {
  lc:53, asked:'Amazon · Microsoft · Apple · LinkedIn',
  stmt:'Given an integer array <code>nums</code>, find the contiguous subarray (containing at least one number) which has the largest sum and return its sum.',
  ex:[
    ['nums = [-2,1,-3,4,-1,2,1,-5,4]','6','Subarray [4,−1,2,1] has sum = 6'],
    ['nums = [1]','1','Single element'],
    ['nums = [5,4,-1,7,8]','23','Entire array']
  ],
  constraints:['1 ≤ nums.length ≤ 10⁵','−10⁴ ≤ nums[i] ≤ 10⁴'],
  approaches:[
    {n:'Brute Force',t:'O(n²)',s:'O(1)',
     steps:['Try all (i, j) pairs, compute subarray sum — O(n²) or O(n³) naive']},
    {n:"Kadane's Algorithm",t:'O(n)',s:'O(1)',best:true,
     steps:['Track curSum = best sum ending at the current position','At each element: curSum = max(nums[i], curSum + nums[i])','If curSum < 0, reset it: starting fresh is better than extending a negative prefix','Track maxSum = max(maxSum, curSum) at each step'],
     py:'def maxSubArray(nums):\n    cur_sum = max_sum = nums[0]\n    for num in nums[1:]:\n        cur_sum = max(num, cur_sum + num)  # extend or restart\n        max_sum = max(max_sum, cur_sum)\n    return max_sum',
     js:'function maxSubArray(nums) {\n    let curSum = nums[0], maxSum = nums[0];\n    for (let i = 1; i < nums.length; i++) {\n        curSum = Math.max(nums[i], curSum + nums[i]);\n        maxSum = Math.max(maxSum, curSum);\n    }\n    return maxSum;\n}'}
  ],
  cards:[
    ['⚡',"Kadane's key insight",'At each position, ask: "Is it better to extend the running sum or start fresh?" If curSum + nums[i] < nums[i], the prefix is hurting — discard it.'],
    ['🔄','Equivalent to: reset when curSum < 0','max(nums[i], curSum + nums[i]) is the same as: if curSum < 0 then curSum = nums[i] else curSum += nums[i]. Either form is correct.'],
    ['🗺','Divide and Conquer alternative','Split at midpoint, answer is in left half, right half, or crosses mid. O(n log n) — elegant but Kadane\'s is simpler and faster.'],
    ['📍','Track start/end for indices','If the problem asks for the actual subarray (not just the sum), maintain start/end/tempStart indices alongside curSum and update on reset and on new maximum.']
  ],
  pats:["Kadane's algorithm",'Running best with fresh-start decision','Greedy: extend vs restart','DP: dp[i] = best sum ending at i'],
  rel:[[152,'Maximum Product Subarray','med','Same idea but with products — track min too'],[918,'Maximum Sum Circular Subarray','med','Kadane on circular array'],[121,'Best Time to Buy & Sell Stock','easy','Kadane on difference array'],[560,'Subarray Sum = K','med','Hash map of prefix sums for exact target']]
},

/* ─────────────────────────────────────────────────────────
   P15  LC#15  3Sum                                    Med
───────────────────────────────────────────────────────── */
'p-three-sum': {
  lc:15, asked:'Facebook · Amazon · Google · Microsoft',
  stmt:'Given an integer array <code>nums</code>, return all triplets <code>[nums[i], nums[j], nums[k]]</code> such that <code>i ≠ j ≠ k</code> and <code>nums[i] + nums[j] + nums[k] == 0</code>. The solution set must not contain duplicate triplets.',
  ex:[
    ['nums = [-1,0,1,2,-1,-4]','[[-1,-1,2],[-1,0,1]]','Two distinct triplets summing to 0'],
    ['nums = [0,0,0]','[[0,0,0]]','One triplet: all zeros'],
    ['nums = [1,2,-2,-1]','[]','No triplet sums to zero']
  ],
  constraints:['3 ≤ nums.length ≤ 3000','−10⁵ ≤ nums[i] ≤ 10⁵'],
  approaches:[
    {n:'Brute Force (3 loops)',t:'O(n³)',s:'O(n)',
     steps:['Try all (i,j,k) triples — O(n³). Add to a set to de-duplicate.']},
    {n:'Sort + Two Pointers',t:'O(n²)',s:'O(n)',best:true,
     steps:['Sort the array — O(n log n). This allows de-duplication via skip-duplicates.','Fix index i (the first element of the triplet) from 0 to n−3','Set left = i+1, right = n−1, then run two-pointer search for -(nums[i])','If sum < 0: left++; if sum > 0: right--; if sum == 0: record and skip duplicates on both pointers','Skip duplicate values of nums[i] in the outer loop (if nums[i] == nums[i-1], skip)'],
     py:'def threeSum(nums):\n    nums.sort()\n    result = []\n    for i in range(len(nums) - 2):\n        if i > 0 and nums[i] == nums[i-1]:\n            continue  # skip duplicate pivot\n        left, right = i + 1, len(nums) - 1\n        while left < right:\n            s = nums[i] + nums[left] + nums[right]\n            if s == 0:\n                result.append([nums[i], nums[left], nums[right]])\n                while left < right and nums[left] == nums[left+1]: left += 1\n                while left < right and nums[right] == nums[right-1]: right -= 1\n                left += 1; right -= 1\n            elif s < 0:\n                left += 1\n            else:\n                right -= 1\n    return result',
     js:'function threeSum(nums) {\n    nums.sort((a, b) => a - b);\n    const result = [];\n    for (let i = 0; i < nums.length - 2; i++) {\n        if (i > 0 && nums[i] === nums[i-1]) continue;\n        let left = i+1, right = nums.length-1;\n        while (left < right) {\n            const s = nums[i] + nums[left] + nums[right];\n            if (s === 0) {\n                result.push([nums[i], nums[left], nums[right]]);\n                while (left < right && nums[left] === nums[left+1]) left++;\n                while (left < right && nums[right] === nums[right-1]) right--;\n                left++; right--;\n            } else if (s < 0) left++;\n            else right--;\n        }\n    }\n    return result;\n}'}
  ],
  cards:[
    ['🔀','Sort enables deduplication + two pointers','After sorting, equal values are adjacent — you can skip duplicates with a simple equality check. Sorted order also lets two pointers converge correctly.'],
    ['📌','Fix one, two-pointer for the other two','Reduce 3Sum → 2Sum by fixing nums[i]. The two-pointer on the remaining subarray runs in O(n), giving O(n²) total.'],
    ['🚫','Skip duplicates in the outer AND inner loops','If nums[i] == nums[i-1] (i>0), skip. After finding a triplet, skip equal values at left and right before moving pointers — otherwise the same triplet is added multiple times.'],
    ['🏷','Base cases: early termination','If nums[i] > 0, break — the remaining values are all positive, so no triplet can sum to 0. Shaves constant time off the tail.']
  ],
  pats:['Sort + two-pointer','Fix one element, reduce k-Sum','Deduplication by adjacent-equal skip'],
  rel:[[1,'Two Sum','easy','Two-pointer / hash map, no duplicates concern'],[16,'3Sum Closest','med','Same structure but minimise |sum - target|'],[18,'4Sum','med','Fix two elements, two-pointer on the rest'],[259,'3Sum Smaller','med','Count triplets summing < target']]
},

/* ─────────────────────────────────────────────────────────
   P16  LC#1143  Longest Common Subsequence            Med
───────────────────────────────────────────────────────── */
'p-lcs': {
  lc:1143, asked:'Amazon · Google · Microsoft',
  stmt:'Given two strings <code>text1</code> and <code>text2</code>, return the length of their longest common subsequence. A subsequence is a sequence derived from a string by deleting some (or no) characters without changing the relative order of the remaining characters.',
  ex:[
    ['text1 = "abcde", text2 = "ace"','3','"ace" is a common subsequence of length 3'],
    ['text1 = "abc", text2 = "abc"','3','The whole string is its own LCS'],
    ['text1 = "abc", text2 = "def"','0','No common subsequence']
  ],
  constraints:['1 ≤ text1.length, text2.length ≤ 1000','text1 and text2 consist of only lowercase English characters'],
  approaches:[
    {n:'Recursion (no memo)',t:'O(2^(m+n))',s:'O(m+n)',
     steps:['lcs(i,j): if chars match, 1+lcs(i+1,j+1); else max(lcs(i+1,j), lcs(i,j+1))','Exponential recomputation']},
    {n:'2D DP (bottom-up)',t:'O(m×n)',s:'O(m×n)',best:true,
     steps:['Create dp[m+1][n+1] initialised to 0','Fill row by row: if text1[i-1]==text2[j-1], dp[i][j]=1+dp[i-1][j-1]','Else dp[i][j]=max(dp[i-1][j], dp[i][j-1])','Answer is dp[m][n]'],
     py:'def longestCommonSubsequence(text1, text2):\n    m, n = len(text1), len(text2)\n    dp = [[0]*(n+1) for _ in range(m+1)]\n    for i in range(1, m+1):\n        for j in range(1, n+1):\n            if text1[i-1] == text2[j-1]:\n                dp[i][j] = 1 + dp[i-1][j-1]\n            else:\n                dp[i][j] = max(dp[i-1][j], dp[i][j-1])\n    return dp[m][n]',
     js:'function longestCommonSubsequence(text1, text2) {\n    const m = text1.length, n = text2.length;\n    const dp = Array.from({length: m+1}, () => new Array(n+1).fill(0));\n    for (let i = 1; i <= m; i++)\n        for (let j = 1; j <= n; j++)\n            dp[i][j] = text1[i-1]===text2[j-1]\n                ? 1+dp[i-1][j-1]\n                : Math.max(dp[i-1][j], dp[i][j-1]);\n    return dp[m][n];\n}'}
  ],
  cards:[
    ['🔲','2D DP grid is intuitive','Rows = text1, columns = text2. dp[i][j] = LCS of text1[0..i-1] and text2[0..j-1]. The boundary row/column is all zeros (empty string has no common chars).'],
    ['🔀','Two cases per cell','Match: diagonal + 1. No match: max of left (skip text2 char) and above (skip text1 char). This captures all ways to skip characters.'],
    ['💾','Space optimizable to O(n)','You only ever read dp[i-1][*] when computing dp[i][*]. Keep two 1D arrays (prev, curr) or roll in-place — same correctness, half the space.'],
    ['↩','Reconstruct actual LCS','Backtrack from dp[m][n]: if chars matched, go diagonal and prepend the char; else follow the larger neighbor. Path gives the actual subsequence.']
  ],
  pats:['2D interval/string DP','Match-or-skip recurrence','Sequence alignment'],
  rel:[[72,'Edit Distance','med','LCS extended to insertions and deletions'],[516,'Longest Palindromic Subsequence','med','LCS(s, reverse(s))'],[1035,'Uncrossed Lines','med','Identical to LCS — visual disguise'],[583,'Delete Op for Two Strings','med','Minimum deletions = m+n - 2*LCS']]
},

/* ─────────────────────────────────────────────────────────
   P17  LC#238  Product of Array Except Self           Med
───────────────────────────────────────────────────────── */
'p-product-except-self': {
  lc:238, asked:'Facebook · Amazon · Microsoft · Apple',
  stmt:'Given an integer array <code>nums</code>, return an array <code>answer</code> where <code>answer[i]</code> is the product of all elements of <code>nums</code> except <code>nums[i]</code>. You must solve it in O(n) time without using division.',
  ex:[
    ['nums = [1,2,3,4]','[24,12,8,6]','answer[0]=2×3×4=24, answer[1]=1×3×4=12, ...'],
    ['nums = [-1,1,0,-3,3]','[0,0,9,0,0]','Zero causes all others to be 0 except index with the zero']
  ],
  constraints:['2 ≤ nums.length ≤ 10⁵','−30 ≤ nums[i] ≤ 30','The product of any prefix or suffix fits in a 32-bit integer'],
  approaches:[
    {n:'Division trick',t:'O(n)',s:'O(1)',
     steps:['Compute total product, divide by nums[i] — BANNED: division not allowed + fails on zeros']},
    {n:'Prefix × Suffix products',t:'O(n)',s:'O(1) extra',best:true,
     steps:['Pass 1 (left→right): answer[i] = product of all elements LEFT of i (prefix product)','Pass 2 (right→left): multiply answer[i] by the running suffix product (product of all elements RIGHT of i)','The output array itself is used for the prefix pass — no extra O(n) array needed'],
     py:'def productExceptSelf(nums):\n    n = len(nums)\n    answer = [1] * n\n    # Pass 1: prefix products\n    prefix = 1\n    for i in range(n):\n        answer[i] = prefix\n        prefix *= nums[i]\n    # Pass 2: multiply by suffix products\n    suffix = 1\n    for i in range(n-1, -1, -1):\n        answer[i] *= suffix\n        suffix *= nums[i]\n    return answer',
     js:'function productExceptSelf(nums) {\n    const n = nums.length, answer = new Array(n).fill(1);\n    let prefix = 1;\n    for (let i = 0; i < n; i++) {\n        answer[i] = prefix;\n        prefix *= nums[i];\n    }\n    let suffix = 1;\n    for (let i = n-1; i >= 0; i--) {\n        answer[i] *= suffix;\n        suffix *= nums[i];\n    }\n    return answer;\n}'}
  ],
  cards:[
    ['✂','Split every element\'s product into left × right','product_except_self[i] = (product of nums[0..i-1]) × (product of nums[i+1..n-1]). These two halves can be computed independently in two passes.'],
    ['💡','Use the output array as prefix storage','After pass 1, answer[i] holds the prefix product up to i-1. Pass 2 multiplies in the suffix — no extra array needed. Output array counts as O(1) extra space.'],
    ['🚫','Division forbidden — and zeros break it','Division would fail if nums contains a zero. The prefix×suffix approach handles zeros naturally: any answer[i] where i is a zero-position will be 0.'],
    ['2️⃣','Two clean passes','Each pass is O(n). Total = O(n) time, O(1) extra space. Simple and elegant — a favourite interview problem for its counter-intuitive "no division" constraint.']
  ],
  pats:['Prefix × suffix product','Two-pass scan','Use output array to save space'],
  rel:[[42,'Trapping Rain Water','hard','Prefix/suffix max — same two-pass idea'],[152,'Maximum Product Subarray','med','Product along one direction, track min/max'],[724,'Find Pivot Index','easy','Prefix sum version of same split idea'],[1352,'Product of Last K','med','Maintain running product in a queue']]
},

/* ─────────────────────────────────────────────────────────
   P18  LC#11  Container With Most Water               Med
───────────────────────────────────────────────────────── */
'p-container-water': {
  lc:11, asked:'Amazon · Google · Bloomberg · Adobe',
  stmt:'You are given an integer array <code>height</code> of length n. There are n vertical lines drawn such that the two endpoints of the i-th line are (i, 0) and (i, height[i]). Find two lines that together with the x-axis form a container that holds the most water. Return the maximum amount of water a container can store.',
  ex:[
    ['height = [1,8,6,2,5,4,8,3,7]','49','Lines at index 1 (h=8) and 8 (h=7): min(8,7)×(8-1)=49'],
    ['height = [1,1]','1','min(1,1)×(1-0)=1']
  ],
  constraints:['n == height.length','2 ≤ n ≤ 10⁵','0 ≤ height[i] ≤ 10⁴'],
  approaches:[
    {n:'Brute Force',t:'O(n²)',s:'O(1)',
     steps:['Try every pair (i,j), compute min(h[i],h[j])×(j-i)','Track maximum area found']},
    {n:'Two Pointers',t:'O(n)',s:'O(1)',best:true,
     steps:['Start with left=0, right=n-1 (widest container possible)','Area = min(height[left], height[right]) × (right - left)','Update maxArea. To try and improve, move the pointer with the SHORTER line inward','Rationale: moving the taller side can only make things worse (width decreases AND bottleneck stays the same or worsens)'],
     py:'def maxArea(height):\n    left, right = 0, len(height) - 1\n    max_area = 0\n    while left < right:\n        area = min(height[left], height[right]) * (right - left)\n        max_area = max(max_area, area)\n        if height[left] < height[right]:\n            left += 1\n        else:\n            right -= 1\n    return max_area',
     js:'function maxArea(height) {\n    let left = 0, right = height.length - 1, maxArea = 0;\n    while (left < right) {\n        const area = Math.min(height[left], height[right]) * (right - left);\n        maxArea = Math.max(maxArea, area);\n        if (height[left] < height[right]) left++;\n        else right--;\n    }\n    return maxArea;\n}'}
  ],
  cards:[
    ['📐','Area = width × min(height)','The bottleneck is always the shorter of the two lines. Making the container wider while keeping the short line guarantees a worse or equal result — so move inward from the shorter side.'],
    ['↔','Why move the shorter side?','Suppose left < right in height. Moving left inward might find a taller line, increasing area. Moving right inward can only shrink width while the bottleneck (left) stays the same — guaranteed to be worse.'],
    ['🏆','Greedy proof by contradiction','Can we miss the optimal pair by moving the shorter side? No — if optimal is (i,j) and we\'re at (l,r) with l<i and r>j, all pointers we\'ll reach include (i,j).'],
    ['📏','Start widest and converge','Beginning at the widest possible gap maximises the chance of a large area. The algorithm never re-examines eliminated positions — each step discards a "provably non-optimal" boundary.']
  ],
  pats:['Two-pointer greedy convergence','Eliminate dominated choices','Width × min-height optimisation'],
  rel:[[42,'Trapping Rain Water','hard','Every cell traps water independently — prefix/suffix max or stack'],[407,'Trapping Rain Water II','hard','3D extension — BFS with min-heap'],[84,'Largest Rectangle in Histogram','hard','Stack-based area maximisation']]
},

/* ─────────────────────────────────────────────────────────
   P19  LC#55  Jump Game                               Med
───────────────────────────────────────────────────────── */
'p-jump-game': {
  lc:55, asked:'Amazon · Google · Microsoft',
  stmt:'You are given an integer array <code>nums</code>. You are initially positioned at the first index, and each element represents your maximum jump length at that position. Return <code>true</code> if you can reach the last index, or <code>false</code> otherwise.',
  ex:[
    ['nums = [2,3,1,1,4]','true','Jump 1 from 0→1, then 3 from 1→4 (last index)'],
    ['nums = [3,2,1,0,4]','false','Every path leads to index 3 where you\'re stuck (jump=0)']
  ],
  constraints:['1 ≤ nums.length ≤ 10⁴','0 ≤ nums[i] ≤ 10⁵'],
  approaches:[
    {n:'DP (backward)',t:'O(n²)',s:'O(n)',
     steps:['Mark last index as "good". From n-2 down to 0: mark good if any reachable index from here is good','O(n²) in worst case']},
    {n:'Greedy (maxReach)',t:'O(n)',s:'O(1)',best:true,
     steps:['Track maxReach = farthest index reachable so far','Scan left to right: at index i, if i > maxReach we\'re stuck — return false','Update maxReach = max(maxReach, i + nums[i])','If we reach the end of the loop, return true'],
     py:'def canJump(nums):\n    max_reach = 0\n    for i, jump in enumerate(nums):\n        if i > max_reach:\n            return False  # stuck — can\'t reach index i\n        max_reach = max(max_reach, i + jump)\n    return True',
     js:'function canJump(nums) {\n    let maxReach = 0;\n    for (let i = 0; i < nums.length; i++) {\n        if (i > maxReach) return false;\n        maxReach = Math.max(maxReach, i + nums[i]);\n    }\n    return true;\n}'}
  ],
  cards:[
    ['🎯','Track the farthest reach','maxReach is the key variable. At each step, it tells you the farthest position currently reachable. If i > maxReach, no sequence of jumps can get you to index i.'],
    ['⚡','O(n) greedy beats O(n²) DP','The greedy works because: if you can reach index i, you can also reach anything ≤ i. The max-reach captures all reachable positions in a single value.'],
    ['🔄','Extends to Jump Game II (min jumps)','For LC#45, track the end of the current "jump range". When you pass that end, increment jumps and set new range end to current maxReach.'],
    ['0️⃣','Zeros are the obstacle','A 0 at position i means you can\'t jump from that position. The only issue is if you\'re forced to land there (all paths lead through it) with no bypass.']
  ],
  pats:['Greedy running maximum','Reachability with single variable','Interval coverage greedy'],
  rel:[[45,'Jump Game II','med','Minimum jumps to reach end — greedy BFS levels'],[1306,'Jump Game III','med','Jump ±k, can you reach index with value 0?'],[1345,'Jump Game IV','hard','BFS with index-value map for long jumps'],[55,'Jump Game','med','This problem']]
},

/* ─────────────────────────────────────────────────────────
   P20  LC#39  Combination Sum                         Med
───────────────────────────────────────────────────────── */
'p-combination-sum': {
  lc:39, asked:'Amazon · Google · Bloomberg',
  stmt:'Given an array of distinct integers <code>candidates</code> and a target integer <code>target</code>, return a list of all unique combinations of candidates where the chosen numbers sum to target. The same number may be chosen from candidates an unlimited number of times. Combinations may be returned in any order.',
  ex:[
    ['candidates = [2,3,6,7], target = 7','[[2,2,3],[7]]','2+2+3=7 and 7=7'],
    ['candidates = [2,3,5], target = 8','[[2,2,2,2],[2,3,3],[3,5]]','Three combinations']
  ],
  constraints:['1 ≤ candidates.length ≤ 30','2 ≤ candidates[i] ≤ 40','All candidates are distinct','1 ≤ target ≤ 40'],
  approaches:[
    {n:'Backtracking',t:'O(N^(T/M))',s:'O(T/M)',best:true,
     steps:['Sort candidates to enable early stopping (optional but helpful)','Backtrack with current combination and remaining target','At each step, try candidates from index start onward (allows reuse, prevents duplicates)','If remaining == 0: record the combination','If remaining < 0 (or candidate > remaining): prune — stop exploring this branch'],
     py:'def combinationSum(candidates, target):\n    result = []\n    def backtrack(start, current, remaining):\n        if remaining == 0:\n            result.append(current[:])\n            return\n        for i in range(start, len(candidates)):\n            c = candidates[i]\n            if c > remaining:\n                break  # sorted: larger candidates won\'t work either\n            current.append(c)\n            backtrack(i, current, remaining - c)  # i, not i+1 (reuse allowed)\n            current.pop()\n    candidates.sort()\n    backtrack(0, [], target)\n    return result',
     js:'function combinationSum(candidates, target) {\n    candidates.sort((a,b) => a-b);\n    const result = [];\n    function backtrack(start, current, remaining) {\n        if (remaining === 0) { result.push([...current]); return; }\n        for (let i = start; i < candidates.length; i++) {\n            if (candidates[i] > remaining) break;\n            current.push(candidates[i]);\n            backtrack(i, current, remaining - candidates[i]);\n            current.pop();\n        }\n    }\n    backtrack(0, [], target);\n    return result;\n}'}
  ],
  cards:[
    ['♻','Pass i (not i+1) to allow reuse','The key difference from Subsets or Permutations: pass the SAME index i to the recursive call so the same candidate can be selected again in the next position.'],
    ['✂','Sort + break prunes the tree','Sorting ensures that once candidates[i] > remaining, all subsequent candidates are also too large. The break exits early instead of exploring dead branches.'],
    ['🌳','Recursion tree has O(N^(T/M)) nodes','N = number of candidates, T = target, M = minimum candidate value. At each node up to N children, and depth is at most T/M.'],
    ['🔢','Combination Sum II vs this','LC#40 has duplicates in candidates and each element can only be used once. Fix: sort, skip if candidates[i]==candidates[i-1] and i>start.']
  ],
  pats:['Backtracking with reuse','Start-index to avoid duplicate combos','Prune on sorted candidates'],
  rel:[[40,'Combination Sum II','med','No reuse, skip duplicates — sort+backtrack'],[216,'Combination Sum III','med','Exactly k numbers, digits 1-9'],[377,'Combination Sum IV','med','Count combos (order matters) — DP'],[78,'Subsets','med','No target, include all sizes']]
}

}; // end PROB_DATA
