import { createSignal, type Component } from 'solid-js';

import styles from './App.module.css';
import { Button } from '@suid/material';

const calculateGraph = (timestamps: number[]) => {
  timestamps.slice(10);

  const min = Math.min(...timestamps);
  const max = Math.max(...timestamps);
  const speeds: number[] = [];
  const points: number[] = [];

  const step = 4;

  for (let i = 0; i < timestamps.length - step; i += step) {
    if (timestamps[i + step] !== timestamps[i]) {
      speeds.push(1 / (timestamps[i + step] - timestamps[i]));
    }
    else {
      speeds.push(0);
    }
  }
  // const minSpeed = Math.min(...timestamps);
  const maxSpeed = Math.max(...speeds);

  for (let i = 0; i < timestamps.length - step; i += step) {
    points.push((timestamps[i] - min) / (max - min) * 1000);
    points.push(300 - speeds[i / step] / maxSpeed * 300);
    // points.push(20);

    points.push((timestamps[i + step] - min) / (max - min) * 1000);
    points.push(300 - speeds[i / step] / maxSpeed * 300);
    // points.push(50);
  }

  return points;
}

const calcHash = async (ab: ArrayBuffer) => {
  const hashBuffer = await crypto.subtle.digest('SHA-256', ab);
  return [...new Uint8Array(hashBuffer)].map(o => o.toString(16).padStart(2, "0")).join("");
}

const App: Component = () => {
  const [deviceFolder, setDeviceFolder] = createSignal<FileSystemDirectoryHandle | undefined>()
  const [running, setRunning] = createSignal(false);
  const [timestamps, setTimestamps] = createSignal<number[]>([])

  return (
    <div class={styles.App}>
      <Button
        variant='contained'
        onClick={async () => {
          setDeviceFolder(await window.showDirectoryPicker({ id: "usb-stick-tester", mode: "readwrite", startIn: "downloads" }));
          console.log(deviceFolder())
        }}
      >Open device</Button>
      <div>Current device: {deviceFolder()?.name}</div>

      <Button variant='contained' onClick={
        async () => {
          setRunning(true);

          const folder = await deviceFolder()?.getDirectoryHandle("usb-stick-tester", { create: true });
          console.log(folder)

          let buffers: Uint8Array[] = new Array(4);
          let closePromise: (Promise<void> | undefined)[] = new Array(4);

          for (let i = 0; i < buffers.length; i += 1) {
            buffers[i] = new Uint8Array(128 * 1024 * 1024);
          }

          setTimestamps([performance.now()]);

          try {
            while (running()) {
              await closePromise[0];
              setTimestamps(o => [...o, performance.now()]);

              const currentBuffer = buffers[0];
              for (let i = 0; i < currentBuffer.length; i += 65536) {
                crypto.getRandomValues(currentBuffer.subarray(i, i + 65536));
              }

              const hashStr = await calcHash(currentBuffer);

              const file = await folder?.getFileHandle(`${hashStr}.dat`, { create: true });
              const stream = await file!.createWritable({ keepExistingData: false });
              await stream.write(currentBuffer);

              closePromise[0] = stream.close();

              buffers.push(buffers.shift()!);
              closePromise.push(closePromise.shift());

              // [currentBuffer, backBuffer] = [backBuffer, currentBuffer];

            }
          }
          catch (ex) {
            // DOMException: The operation failed because it would cause the application to exceed its storage quota.
            // => 0 KB file is left
            console.log(ex);
          }

          setRunning(false);
        }
      }>Write</Button>

      <Button variant='contained'
        onclick={async () => {
          setRunning(true);

          let totalSize = 0;

          const folder = await deviceFolder()?.getDirectoryHandle("usb-stick-tester", { create: true });
          console.log(folder);

          setTimestamps([performance.now()]);

          for await (const fileHandle of folder!.values() as FileSystemFileHandle[]) {
            if (!running()) {
              return;
            }

            if (fileHandle.kind === "file") {
              setTimestamps(o => [...o, performance.now()]);

              const file = await fileHandle.getFile();
              const ab = await file.arrayBuffer();
              const hashStr = await calcHash(ab);

              if (file.name !== `${hashStr}.dat`) {
                throw new Error(`Checksum mismatch ${file.name} vs ${hashStr}.dat`);
              }

              totalSize += ab.byteLength;

            }
          }

          console.log(`Checked size: ${totalSize}`)

          setRunning(false);
        }}>
        Check
      </Button>

      <Button variant='contained' disabled={!running()} onclick={
        () => {
          setRunning(false)
        }
      }>Abort</Button>

      <svg width={1000} height={300} style={{ background: "#f0f0f0" }}>
        <polyline points={calculateGraph(timestamps()).join(',')} fill="none" stroke="black"></polyline>
      </svg>
    </div>
  );
};

export default App;
