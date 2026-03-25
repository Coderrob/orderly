#!/usr/bin/env node

import { createRootCommand } from './cli/root-command';

createRootCommand().parse();
