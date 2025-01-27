import { Worker, Job } from 'bullmq';
import { workerConnection } from './lib/worker.config';
import { tasksHandler } from './tasks';
import dbConnect from './models/dbConnect';
new Worker('main',
    async (job: Job) => {
        console.log(job.name)
        switch (job.name) {
            case "balance":
                await tasksHandler.updateBalance(job)
                break;
            case "sendMessage":
                await tasksHandler.bot.sendMessage(job)
                break
            case "bridge":
                break
            default:
                break;
        }
    },
    { connection: workerConnection, concurrency: 50 }
)
    .on("ready", async () => {
        await dbConnect()
        console.log("Worker Started")
    })
    .on('completed', job => {
        console.log(`${job.id} has completed!`);
    });