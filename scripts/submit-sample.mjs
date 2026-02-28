#!/usr/bin/env node
import { readFile } from 'node:fs/promises';

const apiUrl = process.env.API_URL ?? 'http://localhost:8080/api';
const transcriptPath = process.argv[2] ?? './data/input-transcript.txt';

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  const transcript = await readFile(transcriptPath, 'utf8');

  const createRes = await fetch(`${apiUrl}/jobs`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ transcript }),
  });

  if (!createRes.ok) {
    throw new Error(`Failed to create job: ${createRes.status}`);
  }

  const createBody = await createRes.json();
  console.log(`jobId=${createBody.jobId} status=${createBody.status} deduplicated=${createBody.deduplicated}`);

  let status = createBody.status;
  while (status === 'pending' || status === 'processing') {
    await sleep(1500);
    const pollRes = await fetch(`${apiUrl}/jobs/${createBody.jobId}`);
    if (!pollRes.ok) {
      throw new Error(`Poll failed: ${pollRes.status}`);
    }
    const poll = await pollRes.json();
    status = poll.status;
    console.log(`status=${status}`);

    if (status === 'completed') {
      console.log(JSON.stringify(poll.graph, null, 2));
      break;
    }

    if (status === 'failed') {
      console.error(poll.error);
      process.exit(1);
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
