// ============================================================
// TASK GENERATOR MODULE
// ============================================================
import Config from './config.js';
import Planner from './planner.js';

const TaskGenerator = {
    // Generate position near boundaries (for robot starting positions)
    generateBoundaryPosition(excludePositions = []) {
        let pos;
        let attempts = 0;
        const maxAttempts = 200;
        const boundaryDepth = 2; // How close to the edge

        do {
            // Randomly pick a boundary edge (0=top, 1=right, 2=bottom, 3=left)
            const edge = Math.floor(Math.random() * 4);

            switch (edge) {
                case 0: // Top edge
                    pos = {
                        x: Math.floor(Math.random() * Config.GRID_COLS),
                        y: Math.floor(Math.random() * boundaryDepth)
                    };
                    break;
                case 1: // Right edge
                    pos = {
                        x: Config.GRID_COLS - 1 - Math.floor(Math.random() * boundaryDepth),
                        y: Math.floor(Math.random() * Config.GRID_ROWS)
                    };
                    break;
                case 2: // Bottom edge
                    pos = {
                        x: Math.floor(Math.random() * Config.GRID_COLS),
                        y: Config.GRID_ROWS - 1 - Math.floor(Math.random() * boundaryDepth)
                    };
                    break;
                case 3: // Left edge
                    pos = {
                        x: Math.floor(Math.random() * boundaryDepth),
                        y: Math.floor(Math.random() * Config.GRID_ROWS)
                    };
                    break;
            }
            attempts++;
        } while (
            attempts < maxAttempts && (
                Config.isObstacle(pos.x, pos.y) ||
                excludePositions.some(p => p.x === pos.x && p.y === pos.y)
            )
        );

        return pos;
    },

    // Generate position adjacent to obstacles (for targets near shelves)
    generateNearShelfPosition(excludePositions = []) {
        let pos;
        let attempts = 0;
        const maxAttempts = 200;

        // Get all cells adjacent to obstacles
        const adjacentCells = [];
        const dirs = [{x: 0, y: -1}, {x: 1, y: 0}, {x: 0, y: 1}, {x: -1, y: 0}];

        for (const obs of Config.obstacles) {
            for (const dir of dirs) {
                const nx = obs.x + dir.x;
                const ny = obs.y + dir.y;
                if (Config.isValidCell(nx, ny) && !Config.isObstacle(nx, ny)) {
                    // Check if not already in list
                    if (!adjacentCells.some(c => c.x === nx && c.y === ny)) {
                        adjacentCells.push({x: nx, y: ny});
                    }
                }
            }
        }

        if (adjacentCells.length === 0) {
            // Fallback to random position if no adjacent cells
            return this.generateRandomPosition(excludePositions);
        }

        do {
            pos = adjacentCells[Math.floor(Math.random() * adjacentCells.length)];
            attempts++;
        } while (
            attempts < maxAttempts &&
            excludePositions.some(p => p.x === pos.x && p.y === pos.y)
        );

        return pos;
    },

    generateRandomPosition(excludePositions = []) {
        let pos;
        let attempts = 0;
        const maxAttempts = 100;

        do {
            pos = {
                x: Math.floor(Math.random() * Config.GRID_COLS),
                y: Math.floor(Math.random() * Config.GRID_ROWS)
            };
            attempts++;
        } while (
            attempts < maxAttempts && (
                Config.isObstacle(pos.x, pos.y) ||
                excludePositions.some(p => p.x === pos.x && p.y === pos.y)
            )
        );

        return pos;
    },

    assignNewTarget(robot, allRobots, stats, reachedTarget = true, simTimeSeconds = 0) {
        if (reachedTarget) {
            // Calculate path length for completed task (steps taken = cells traveled)
            const pathLength = robot.totalSteps - robot.taskStartStep;
            if (pathLength > 0) {
                stats.pathLengths.push(pathLength);
                if (pathLength > stats.worstLatency) {
                    stats.worstLatency = pathLength;
                }
            }

            // Record completion time for sliding window throughput
            stats.completionTimes.push(simTimeSeconds);

            // Record replan count for this task
            stats.replanCounts.push(robot.planAttempts - 1);  // -1 because initial plan is not a replan

            // Increment throughput (target reached = success)
            stats.totalThroughput++;
        } else {
            // Target was abandoned
            stats.abandonedTargets++;
        }

        // Exclude: current robot position, all other robots' positions, and all other targets
        const excludePositions = [
            {x: robot.x, y: robot.y},
            ...allRobots.filter(r => r.id !== robot.id).map(r => ({x: r.x, y: r.y})),
            ...allRobots.filter(r => r.id !== robot.id).map(r => ({x: r.targetX, y: r.targetY}))
        ];

        const newTarget = this.generateNearShelfPosition(excludePositions);
        robot.targetX = newTarget.x;
        robot.targetY = newTarget.y;

        // Reset task start step for new task
        robot.taskStartStep = robot.totalSteps;

        // Reset plan attempts for new target
        robot.planAttempts = 1;  // This is the first attempt for new target

        Planner.planPathForRobot(robot, allRobots);
    },

    createRobot(id, allRobots) {
        // Exclude all existing robot positions for start position
        const existingPositions = allRobots.map(r => ({x: r.x, y: r.y}));
        const startPos = this.generateBoundaryPosition(existingPositions);

        // Exclude: all robot positions, all targets, and the new start position
        const excludeForTarget = [
            ...existingPositions,
            ...allRobots.map(r => ({x: r.targetX, y: r.targetY})),
            startPos
        ];
        const targetPos = this.generateNearShelfPosition(excludeForTarget);

        return {
            id: id,
            color: Config.ROBOT_COLORS[allRobots.length % Config.ROBOT_COLORS.length],
            x: startPos.x,
            y: startPos.y,
            targetX: targetPos.x,
            targetY: targetPos.y,
            path: [],
            pathIndex: 0,
            taskStartStep: 0,      // Track when current task started
            totalSteps: 0,         // Total steps taken by this robot
            planAttempts: 1        // Number of plan attempts for current target (starts at 1)
        };
    },

    createRobots(count) {
        const robots = [];
        for (let i = 0; i < count; i++) {
            const robot = this.createRobot(String(i + 1), robots);
            robots.push(robot);
        }
        return robots;
    }
};

export default TaskGenerator;
