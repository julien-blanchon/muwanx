<div align="center">
  <img src="public/muwanx_banner.png" alt="muwanx">
</div>
<div align="center">
    <em>Client-only MuJoCo + ONNX Reinforcement Learning Playground</em>
</div>

<br>

<p align="center">
    <a href="https://github.com/ttktjmt/muwanx/actions/workflows/deploy.yml"><img src="https://github.com/ttktjmt/muwanx/actions/workflows/deploy.yml/badge.svg" alt="GitHub Pages CI"/></a>
    <a href="https://ttktjmt.github.io/muwanx/"><img src="https://img.shields.io/badge/demo-🚀%20live-green" alt="Live Demo"/></a>
    <a href="https://github.com/ttktjmt/muwanx/blob/main/LICENSE"><img src="https://img.shields.io/github/license/ttktjmt/muwanx" alt="License"/></a>
</p>

---

**Muwanx** is a reinforcement learning demo web application built with [mujoco_wasm](https://github.com/zalo/mujoco_wasm/) and [ONNX Runtime Web](https://www.onnxruntime.ai/docs/build/web.html). This allows you to run MuJoCo simulations in real-time with trained policies controlling entirely client-side. Ideal for sharing interactive demos as a static site (e.g., hosting on GitHub Pages), prototyping policies, or building customizable RL playgrounds directly in the browser.

### 🚀 [Visit the Live Demo](https://ttktjmt.github.io/muwanx/)

## Features
- **Real-time**: Run MuJoCo simulations with real-time policy control.
- **Interactive**: Change the state of objects by applying forces.
- **Client-only**: All computation runs in the browser. No server for simulation required.
- **Easy Sharing**: Host as a static site for effortless demo distribution (e.g., GitHub Pages).
- **Customizable**: Add your own MuJoCo models and ONNX policies quickly.

## Quick Start

To run muwanx locally, ensure you have [Node.js](https://nodejs.org/) installed, then execute the following commands in your terminal.

Clone the repository on your local machine:
```bash
git clone https://github.com/ttktjmt/muwanx.git
cd muwanx
```

Install the dependencies and start the development server:
```bash
npm install
npm run dev
```

Open your browser and navigate to the localhost URL shown in the terminal to see Muwanx in action.

## Acknowledgments

This project has greatly benefited from the contributions of the [Facet](https://github.com/Facet-Team/facet) project by the research group at Tsinghua University.

## Support

For support, please open a [GitHub issue](https://github.com/ttktjmt/muwanx/issues/new). We welcome bug reports, feature requests, and questions about using Muwanx.

## License

This project is licensed under the terms of the MIT open source license. Please refer to the [LICENSE](./LICENSE) file for the full terms.
