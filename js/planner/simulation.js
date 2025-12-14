// ============================================================
// SIMULATION CONTROLLER
// ============================================================
import Config from './config.js';
import Visualization from './visualization.js';
import Planner from './planner.js';
import TaskGenerator from './task-generator.js';

const Simulation = {
    robots: [],
    stats: {
        activeRobots: 0,
        totalThroughput: 0,        // Total tasks completed (targets reached)
        abandonedTargets: 0,       // Targets abandoned (couldn't reach)
        collisionsAvoided: 0,
        totalSimSteps: 0,         // Total simulation steps elapsed
        completionTimes: [],      // Array of completion times (in sim seconds) for sliding window
        pathLengths: [],          // Array of completed path lengths (in cells)
        replanCounts: [],         // Array of replan counts for completed tasks
        worstLatency: 0            // Worst latency seen (in steps)
    },
    isRunning: false,
    animationId: null,
    lastUpdate: 0,

    init() {
        Config.init();
        this.setupEventListeners();
        this.reset();
        // Auto-start simulation after a brief delay to ensure everything is ready
        setTimeout(() => this.start(), 100);
    },

    setupEventListeners() {
        const robotCountSlider = document.getElementById('robotCount');
        const robotCountDisplay = document.getElementById('robotCountDisplay');

        robotCountSlider.addEventListener('input', (e) => {
            const count = parseInt(e.target.value);
            robotCountDisplay.textContent = count;
            Config.robotCount = count;
            this.reset();
        });

        // Grid size sliders
        const gridColsSlider = document.getElementById('gridCols');
        const gridColsDisplay = document.getElementById('gridColsDisplay');
        const gridRowsSlider = document.getElementById('gridRows');
        const gridRowsDisplay = document.getElementById('gridRowsDisplay');

        gridColsSlider.addEventListener('input', (e) => {
            const cols = parseInt(e.target.value);
            gridColsDisplay.textContent = cols;
            Config.GRID_COLS = cols;
            Config.CELL_WIDTH = Config.canvas.width / Config.GRID_COLS;
            Config.generateObstacles();
            this.reset();
        });

        gridRowsSlider.addEventListener('input', (e) => {
            const rows = parseInt(e.target.value);
            gridRowsDisplay.textContent = rows;
            Config.GRID_ROWS = rows;
            Config.CELL_HEIGHT = Config.canvas.height / Config.GRID_ROWS;
            Config.generateObstacles();
            this.reset();
        });

        // Robot speed slider
        const robotSpeedSlider = document.getElementById('robotSpeed');
        const robotSpeedDisplay = document.getElementById('robotSpeedDisplay');

        robotSpeedSlider.addEventListener('input', (e) => {
            const speed = parseFloat(e.target.value);
            robotSpeedDisplay.textContent = speed.toFixed(1);
            Config.robotSpeed = speed;
            // No reset needed - speed change takes effect immediately
        });
    },

    start() {
        if (!this.isRunning) {
            this.isRunning = true;

            // Initialize paths if not done
            for (const robot of this.robots) {
                if (robot.path.length === 0) {
                    Planner.planPathForRobot(robot, this.robots);
                }
            }

            this.animationId = requestAnimationFrame((t) => this.gameLoop(t));
        }
    },

    pause() {
        this.isRunning = false;
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
        }
    },

    reset() {
        this.pause();

        // Reset stats
        this.stats = {
            activeRobots: Config.robotCount,
            totalThroughput: 0,
            abandonedTargets: 0,
            collisionsAvoided: 0,
            totalSimSteps: 0,
            completionTimes: [],
            pathLengths: [],
            replanCounts: [],
            worstLatency: 0
        };

        // Reset planner
        Planner.reset();

        // Create new robots
        this.robots = TaskGenerator.createRobots(Config.robotCount);

        // Update display
        Visualization.updateStats(this.stats, Config.STEP_DURATION);
        Visualization.render(this.robots);
    },

    update() {
        // Increment simulation time
        this.stats.totalSimSteps++;
        const simTimeSeconds = this.stats.totalSimSteps * Config.STEP_DURATION;

        // Detect and resolve collisions
        Planner.detectAndResolveCollisions(this.robots, this.stats);

        // Move robots
        for (const robot of this.robots) {
            if (robot.path.length > robot.pathIndex + 1) {
                // Has more steps in path - move to next position
                robot.pathIndex++;
                robot.x = robot.path[robot.pathIndex].x;
                robot.y = robot.path[robot.pathIndex].y;
                robot.totalSteps++;  // Increment step count
            } else if (robot.x === robot.targetX && robot.y === robot.targetY) {
                // Reached target, assign new one
                TaskGenerator.assignNewTarget(robot, this.robots, this.stats, true, simTimeSeconds);
            } else {
                // Path is empty or finished but not at target - try to replan
                robot.planAttempts++;

                Planner.planPathForRobot(robot, this.robots);

                // If still no valid path, assign a new target (not counted as reached)
                if (robot.path.length <= 1) {
                    TaskGenerator.assignNewTarget(robot, this.robots, this.stats, false, simTimeSeconds);
                }
            }
        }

        // Update stats
        Visualization.updateStats(this.stats, Config.STEP_DURATION);
    },

    gameLoop(timestamp) {
        if (!this.isRunning) return;

        if (timestamp - this.lastUpdate >= Config.UPDATE_INTERVAL) {
            this.update();
            this.lastUpdate = timestamp;
        }

        Visualization.render(this.robots);
        this.animationId = requestAnimationFrame((t) => this.gameLoop(t));
    }
};

export default Simulation;
