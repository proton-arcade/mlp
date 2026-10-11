import { ensureClient } from '../lib/auth.js';
import { CLIError } from '../lib/errors.js';
import * as ui from '../lib/ui.js';

export async function whoamiCommand() {
  const mixt = await ensureClient();
  let user;
  try {
    user = await mixt.auth.getUser();
  } catch (err) {
    throw new CLIError(`Could not fetch account: ${err.message}`);
  }

  ui.out(user?.username ?? '(unknown)');
  if (user?.email) ui.status(ui.dim(user.email));
}
