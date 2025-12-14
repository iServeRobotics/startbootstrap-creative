// ============================================================
// PLANNER MODULE (A* Algorithm)
// ============================================================
import Config from './config.js';

const Planner = {
    planningTimes: [],

    heuristic(a, b) {
        return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
    },

    getNeighbors(node) {
        const neighbors = [];
        const dirs = [{x: 0, y: -1}, {x: 1, y: 0}, {x: 0, y: 1}, {x: -1, y: 0}];

        for (const dir of dirs) {
            const nx = node.x + dir.x;
            const ny = node.y + dir.y;
            if (Config.isValidCell(nx, ny) && !Config.isObstacle(nx, ny)) {
                neighbors.push({x: nx, y: ny});
            }
        }
        return neighbors;
    },

    findPath(start, goal, blockedCells = []) {
        const startTime = performance.now();
        const openSet = [{...start, g: 0, f: this.heuristic(start, goal)}];
        const closedSet = new Set();
        const cameFrom = new Map();

        while (openSet.length > 0) {
            openSet.sort((a, b) => a.f - b.f);
            const current = openSet.shift();

            if (current.x === goal.x && current.y === goal.y) {
                // Reconstruct path
                const path = [];
                let node = current;
                while (node) {
                    path.unshift({x: node.x, y: node.y});
                    node = cameFrom.get(`${node.x},${node.y}`);
                }
                this.planningTimes.push(performance.now() - startTime);
                return path;
            }

            closedSet.add(`${current.x},${current.y}`);

            for (const neighbor of this.getNeighbors(current)) {
                const key = `${neighbor.x},${neighbor.y}`;
                if (closedSet.has(key)) continue;

                // Avoid blocked cells (other robots' positions)
                if (blockedCells.some(c => c.x === neighbor.x && c.y === neighbor.y)) {
                    continue;
                }

                const g = current.g + 1;
                const existing = openSet.find(n => n.x === neighbor.x && n.y === neighbor.y);

                if (!existing) {
                    openSet.push({...neighbor, g, f: g + this.heuristic(neighbor, goal)});
                    cameFrom.set(key, current);
                } else if (g < existing.g) {
                    existing.g = g;
                    existing.f = g + this.heuristic(neighbor, goal);
                    cameFrom.set(key, current);
                }
            }
        }
        return []; // No path found
    },

    planPathForRobot(robot, allRobots) {
        const blockedCells = allRobots
            .filter(r => r.id !== robot.id)
            .map(r => ({x: r.x, y: r.y}));

        robot.path = this.findPath(
            {x: robot.x, y: robot.y},
            {x: robot.targetX, y: robot.targetY},
            blockedCells
        );
        robot.pathIndex = 0;
    },

    /*
     * TODO: Improve collision avoidance
     * Current limitations:
     * 1. Swap collision: If robot A moves (1,0)->(2,0) while robot B moves (2,0)->(1,0),
     *    they pass through each other. Not detected.
     * 2. Future path conflicts: Only checks the immediate next step, not the full path.
     *    Two robots could collide several steps ahead.
     * 3. Following collision: If robot A is at (1,0) and robot B is at (2,0), and both
     *    move right, B's old position isn't blocked for A.
     *
     * Solutions to consider:
     * - Time-based planning (Space-Time A*)
     * - Conflict-Based Search (CBS)
     */
    detectAndResolveCollisions(robots, stats) {
        for (let i = 0; i < robots.length; i++) {
            for (let j = i + 1; j < robots.length; j++) {
                const r1 = robots[i];
                const r2 = robots[j];

                // Check if paths would intersect at next step
                if (r1.path.length > r1.pathIndex + 1 && r2.path.length > r2.pathIndex + 1) {
                    const next1 = r1.path[r1.pathIndex + 1];
                    const next2 = r2.path[r2.pathIndex + 1];

                    if (next1.x === next2.x && next1.y === next2.y) {
                        stats.collisionsAvoided++;

                        // Increment plan attempts for r2
                        r2.planAttempts++;

                        // Replan for the robot with shorter remaining path
                        this.planPathForRobot(r2, robots);
                    }
                }
            }
        }
    },

    getAveragePlanningTime() {
        if (this.planningTimes.length === 0) return 0;
        return this.planningTimes.reduce((a, b) => a + b, 0) / this.planningTimes.length;
    },

    reset() {
        this.planningTimes = [];
    }
};

export default Planner;
