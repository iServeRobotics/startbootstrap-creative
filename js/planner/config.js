// ============================================================
// CONFIGURATION
// ============================================================
const Config = {
    canvas: null,
    ctx: null,
    GRID_COLS: 60,
    GRID_ROWS: 50,
    CELL_WIDTH: 0,
    CELL_HEIGHT: 0,
    robotSpeed: 0.5,              // cells per second (0.2 - 1.0) - real-world speed
    robotCount: 50,
    SIMULATION_SPEED: 10,         // Run simulation at 10x real time

    // Calculate update interval from speed (ms per cell movement) - accelerated for visualization
    get UPDATE_INTERVAL() {
        return 1000 / (this.robotSpeed * this.SIMULATION_SPEED);
    },

    // Step duration in seconds (for latency calculation) - based on real-world speed
    get STEP_DURATION() {
        return 1 / this.robotSpeed;
    },

    // Robot colors palette
    ROBOT_COLORS: [
        '#e53935', '#1e88e5', '#43a047', '#8e24aa',
        '#ff9800', '#00acc1', '#d81b60', '#5e35b1',
        '#00897b', '#c0ca33'
    ],

    // Obstacles (grid positions)
    obstacles: [],

    generateObstacles() {
        this.obstacles = [];
        const cols = this.GRID_COLS;
        const rows = this.GRID_ROWS;

        // Generate shelving units in a warehouse pattern
        // Leave aisles for robots to navigate
        const shelfWidth = 1;
        const shelfHeight = 3;
        const aisleWidth = 2;
        const marginX = 3;
        const marginY = 2;

        // Calculate how many shelf columns and rows we can fit
        const usableWidth = cols - marginX * 2;
        const usableHeight = rows - marginY * 2;

        const shelfSpacingX = shelfWidth + aisleWidth;
        const shelfSpacingY = shelfHeight + aisleWidth;

        const numShelfCols = Math.floor(usableWidth / shelfSpacingX);
        const numShelfRows = Math.floor(usableHeight / shelfSpacingY);

        for (let sc = 0; sc < numShelfCols; sc++) {
            for (let sr = 0; sr < numShelfRows; sr++) {
                const baseX = marginX + sc * shelfSpacingX;
                const baseY = marginY + sr * shelfSpacingY;

                // Create a vertical shelf unit
                for (let h = 0; h < shelfHeight; h++) {
                    const x = baseX;
                    const y = baseY + h;
                    if (x < cols && y < rows) {
                        this.obstacles.push({x, y});
                    }
                }
            }
        }
    },

    init() {
        this.canvas = document.getElementById('grid-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.CELL_WIDTH = this.canvas.width / this.GRID_COLS;
        this.CELL_HEIGHT = this.canvas.height / this.GRID_ROWS;
        this.generateObstacles();
    },

    isObstacle(x, y) {
        return this.obstacles.some(o => o.x === x && o.y === y);
    },

    isValidCell(x, y) {
        return x >= 0 && x < this.GRID_COLS && y >= 0 && y < this.GRID_ROWS;
    }
};

export default Config;
