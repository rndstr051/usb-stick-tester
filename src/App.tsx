import { createSignal, type Component } from 'solid-js';

import styles from './App.module.css';
import { Button } from '@suid/material';

const App: Component = () => {
  const [deviceFolder, setDeviceFolder] = createSignal<FileSystemDirectoryHandle | undefined>()
  const [running, setRunning] = createSignal(false);


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

          let currentBuffer = new Uint8Array(128 * 1024 * 1024);
          let backBuffer = new Uint8Array(128 * 1024 * 1024);
          let closePromise: Promise<void> | undefined;

          try {
            while (running()) {
              for (let i = 0; i < currentBuffer.length; i += 65536) {
                crypto.getRandomValues(currentBuffer.subarray(i, i + 65536));
              }

              const hashBuffer = await crypto.subtle.digest('SHA-256', currentBuffer);
              const hashStr = [...new Uint8Array(hashBuffer)].map(o => o.toString(16).padStart(2, "0")).join("");

              await closePromise;
              const file = await folder?.getFileHandle(`${hashStr}.dat`, { create: true });
              const stream = await file!.createWritable({ keepExistingData: false });
              await stream.write(currentBuffer);
              closePromise = stream.close();

              [currentBuffer, backBuffer] = [backBuffer, currentBuffer];
            }
          }
          catch (ex) {
            console.log(ex);
          }

          setRunning(false);
        }
      }>Write</Button>

      <Button variant='contained' disabled={!running()} onclick={
        () => {
          setRunning(false)
        }
      }>Abort</Button>
    </div>
  );
};

export default App;
