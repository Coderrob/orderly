#!/usr/bin/env node

import { CliService } from './cli/cli.service';

// Create and run the CLI service
const cliService = new CliService();
cliService.parse();
