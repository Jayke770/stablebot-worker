import { Worker, Job } from 'bullmq';
import { workerConnection, taskQueue } from './lib/worker.config';
import { tasksHandler } from './tasks';
import dbConnect from './models/dbConnect';
import { ITasks } from './types';
new Worker('main',
    async (job: Job) => {
        switch (job.name) {
            case ITasks.balance:
                await tasksHandler.updateBalance(job)
                break;
            case ITasks.sendMessage:
                await tasksHandler.bot.sendMessage(job)
                break
            case ITasks.bridge:
                await tasksHandler.bridge(job)
                break
            case ITasks.retryFailedBridge:
                await tasksHandler.scanFailedBridge()
                break
            default:
                break;
        }
    },
    { connection: workerConnection, concurrency: 50 }
)
    .on("ready", async () => {
        await dbConnect()
        await taskQueue.upsertJobScheduler(
            'recover-failed-bridge',
            {
                every: 60000,
            },
            {
                name: ITasks.retryFailedBridge
            },
        );
        console.log("Worker Started")
    })
    .on('completed', job => {
        console.log(`${job.id} has completed!`);
    })