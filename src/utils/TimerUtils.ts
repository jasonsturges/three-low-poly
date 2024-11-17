/**
 * Set a random timeout that will call the callback function with a random delay between minDelay and maxDelay.
 *
 * Example usage:
 * ```
 * setRandomTimeout(() => {
 *   console.log(`Callback ${i} executed!`);
 * }, 100, 500); // Random timeout between 100ms and 500ms
 * ```
 */
export function setRandomTimeout(callback: () => void, minDelay: number, maxDelay: number) {
  const delay = minDelay + Math.random() * (maxDelay - minDelay);

  return setTimeout(callback, delay);
}

/**
 * Set a random interval that will call the callback function with a random delay between minDelay and maxDelay.
 *
 * Example usage:
 * ```
 * const clearRandomInterval = setRandomInterval(() => {
 *   console.log('Random interval executed!');
 * }, 500, 1500); // Random delay between 500ms and 1500ms
 * ```
 */
export function setRandomInterval(callback: () => void, minDelay: number, maxDelay: number): () => void {
  let timeoutId: ReturnType<typeof setTimeout>;

  function scheduleNext() {
    const delay = minDelay + Math.random() * (maxDelay - minDelay);
    timeoutId = setTimeout(() => {
      callback();
      scheduleNext(); // Schedule the next execution
    }, delay);
  }

  scheduleNext();

  // Return a function to allow clearing the interval
  return () => clearTimeout(timeoutId);
}
