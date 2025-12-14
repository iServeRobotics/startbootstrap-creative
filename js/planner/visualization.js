// ============================================================
// VISUALIZATION MODULE
// ============================================================
import Config from './config.js';

const Visualization = {
    drawGrid() {
        const { ctx, canvas, GRID_COLS, GRID_ROWS, CELL_WIDTH, CELL_HEIGHT } = Config;

        ctx.fillStyle = '#f8f9fa';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Draw grid lines
        ctx.strokeStyle = '#dee2e6';
        ctx.lineWidth = 1;
        for (let i = 0; i <= GRID_COLS; i++) {
            ctx.beginPath();
            ctx.moveTo(i * CELL_WIDTH, 0);
            ctx.lineTo(i * CELL_WIDTH, canvas.height);
            ctx.stroke();
        }
        for (let i = 0; i <= GRID_ROWS; i++) {
            ctx.beginPath();
            ctx.moveTo(0, i * CELL_HEIGHT);
            ctx.lineTo(canvas.width, i * CELL_HEIGHT);
            ctx.stroke();
        }
    },

    drawObstacles() {
        const { ctx, obstacles, CELL_WIDTH, CELL_HEIGHT } = Config;

        ctx.fillStyle = '#424242';
        for (const obs of obstacles) {
            ctx.fillRect(
                obs.x * CELL_WIDTH + 2,
                obs.y * CELL_HEIGHT + 2,
                CELL_WIDTH - 4,
                CELL_HEIGHT - 4
            );
        }
    },

    drawPath(robot) {
        const { ctx, CELL_WIDTH, CELL_HEIGHT } = Config;

        if (robot.path.length > 0) {
            ctx.strokeStyle = robot.color + '40';
            ctx.lineWidth = 3;
            ctx.setLineDash([5, 5]);
            ctx.beginPath();
            ctx.moveTo(
                robot.path[0].x * CELL_WIDTH + CELL_WIDTH / 2,
                robot.path[0].y * CELL_HEIGHT + CELL_HEIGHT / 2
            );
            for (let i = 1; i < robot.path.length; i++) {
                ctx.lineTo(
                    robot.path[i].x * CELL_WIDTH + CELL_WIDTH / 2,
                    robot.path[i].y * CELL_HEIGHT + CELL_HEIGHT / 2
                );
            }
            ctx.stroke();
            ctx.setLineDash([]);
        }
    },

    drawTarget(robot) {
        const { ctx, CELL_WIDTH, CELL_HEIGHT } = Config;

        ctx.fillStyle = '#ffeb3b';
        ctx.strokeStyle = robot.color;
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.arc(
            robot.targetX * CELL_WIDTH + CELL_WIDTH / 2,
            robot.targetY * CELL_HEIGHT + CELL_HEIGHT / 2,
            Math.min(CELL_WIDTH, CELL_HEIGHT) / 3,
            0, Math.PI * 2
        );
        ctx.fill();
        ctx.stroke();
        ctx.setLineDash([]);
    },

    drawRobot(robot) {
        const { ctx, CELL_WIDTH, CELL_HEIGHT } = Config;

        const cx = robot.x * CELL_WIDTH + CELL_WIDTH / 2;
        const cy = robot.y * CELL_HEIGHT + CELL_HEIGHT / 2;
        const radius = Math.min(CELL_WIDTH, CELL_HEIGHT) / 2.5;

        // Robot body
        ctx.fillStyle = robot.color;
        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        ctx.fill();

        // Robot label
        ctx.fillStyle = 'white';
        ctx.font = 'bold 12px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(robot.id, cx, cy);

        // Direction indicator
        if (robot.path.length > robot.pathIndex + 1) {
            const next = robot.path[robot.pathIndex + 1];
            const angle = Math.atan2(next.y - robot.y, next.x - robot.x);
            ctx.strokeStyle = 'white';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(cx, cy);
            ctx.lineTo(cx + Math.cos(angle) * radius * 0.7, cy + Math.sin(angle) * radius * 0.7);
            ctx.stroke();
        }
    },

    render(robots) {
        this.drawGrid();
        this.drawObstacles();

        // Draw paths first (below robots)
        for (const robot of robots) {
            this.drawPath(robot);
        }

        // Draw targets
        for (const robot of robots) {
            this.drawTarget(robot);
        }

        // Draw robots on top
        for (const robot of robots) {
            this.drawRobot(robot);
        }
    },

    updateStats(stats, stepDuration) {
        document.getElementById('activeRobots').textContent = stats.activeRobots;

        // Throughput per hour: sliding window of 1 hour (3600 seconds)
        const simTimeSeconds = stats.totalSimSteps * stepDuration;
        const WARMUP_SIM_TIME = 300;  // 30 seconds wall-clock at 10x = 300 sim seconds

        let throughputDisplay;
        if (simTimeSeconds < WARMUP_SIM_TIME) {
            // First 30 seconds wall-clock: don't show throughput
            throughputDisplay = '-';
        } else if (simTimeSeconds < 3600) {
            // Before 1 hour sim time: prorate estimate
            const tasksCompleted = stats.completionTimes.filter(t => t >= WARMUP_SIM_TIME).length;
            const elapsedSinceWarmup = simTimeSeconds - WARMUP_SIM_TIME;
            const prorated = elapsedSinceWarmup > 0
                ? Math.round((tasksCompleted / elapsedSinceWarmup) * 3600)
                : 0;
            throughputDisplay = prorated + '*';  // * indicates estimate
        } else {
            // Full hour available: use sliding window
            const windowStart = simTimeSeconds - 3600;
            const tasksInWindow = stats.completionTimes.filter(t => t > windowStart).length;
            throughputDisplay = tasksInWindow;
        }
        document.getElementById('throughputPerHour').textContent = throughputDisplay;

        // Success rate: reached / (reached + abandoned)
        const totalAttempted = stats.totalThroughput + stats.abandonedTargets;
        const successRate = totalAttempted > 0
            ? (stats.totalThroughput / totalAttempted * 100)
            : 100;
        document.getElementById('successRate').innerHTML =
            successRate.toFixed(1) + '<small>%</small>';

        // Average replans per completed task
        const avgReplans = stats.replanCounts.length > 0
            ? (stats.replanCounts.reduce((a, b) => a + b, 0) / stats.replanCounts.length)
            : 0;
        document.getElementById('avgReplans').textContent = avgReplans.toFixed(1);

        // Average plan length (in cells)
        const avgPlanLength = stats.pathLengths.length > 0
            ? (stats.pathLengths.reduce((a, b) => a + b, 0) / stats.pathLengths.length)
            : 0;
        document.getElementById('avgPlanLength').innerHTML =
            avgPlanLength.toFixed(1) + '<small>cells</small>';

        // Worst latency (convert steps to seconds)
        const worstLatency = stats.worstLatency * stepDuration;
        document.getElementById('worstLatency').innerHTML =
            worstLatency.toFixed(1) + '<small>s</small>';
    }
};

export default Visualization;
