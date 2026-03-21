#!/usr/bin/env node
// Copyright 2026 a7mddra
// SPDX-License-Identifier: MIT

import React from "react";
import { render } from "ink";
import { App } from "./App";

const { waitUntilExit } = render(React.createElement(App));

waitUntilExit().then(() => {
  process.exit(0);
});
