import { execFile } from 'child_process'
import { promisify } from 'util'

/** Promisified `child_process.execFile`. Single source of truth — import
 *  from here rather than re-running `promisify` per file. */
export const execFileAsync = promisify(execFile)
