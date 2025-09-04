<div align="center">
    <h1>Muwanx</h1>
    <em>Lightweight browser-based RL demo with MuJoCo and ONNX</em>
</div>

<br>

[![GitHub Pages CI](https://github.com/ttktjmt/muwanx/actions/workflows/deploy.yml/badge.svg)](https://github.com/ttktjmt/muwanx/actions/workflows/deploy.yml)
[![GitHub License](https://img.shields.io/github/license/ttktjmt/muwanx)](LICENSE)

---

## What is Muwanx?

**Muwanx** is a lightweight, browser-based reinforcement learning demo web application built with [mujoco_wasm](https://github.com/zalo/mujoco_wasm/) and [ONNX Runtime Web](https://www.onnxruntime.ai/docs/build/web.html). This allows you to run MuJoCo simulations in real-time with trained policies controlling entirely client-side. Ideal for sharing interactive demos as a static site (e.g., hosting on GitHub Pages), prototyping policies, or building customizable RL playgrounds directly in the browser.
### 🚀 [Visit the Live Demo Here](https://ttktjmt.github.io/muwanx/)

## Features

- Real-time control of MuJoCo simulations with trained policies
- Apply force to the simulation for testing robustness of the policies
- Change the state of the goal that policies reference
- Fully client-side execution using MuJoCo compiled in WebAssembly and ONNX Runtime Web
- Easy to share and host as a static site (e.g., GitHub Pages)
- Customizable reinforcement learning playgrounds

## Installation

```bash
git clone https://github.com/ttktjmt/muwanx.git
cd muwanx

npm install
npm run dev
# access the localhost URL shown in the terminal
```

## Acknowledgments

This project has greatly benefited from the contributions of the [Facet](https://github.com/Facet-Team/facet) project by the research group at Tsinghua University.

## Support

For support, please open a [GitHub issue](https://github.com/ttktjmt/muwanx/issues/new). We welcome bug reports, feature requests, and questions about using Muwanx.

## License

This project is licensed under the terms of the MIT open source license. Please refer to the [LICENSE](./LICENSE) file for the full terms.
