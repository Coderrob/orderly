#!/usr/bin/env node

import { createRootCommand } from './cli/root-command';

// Create and run the root CLI command
createRootCommand().parse();
