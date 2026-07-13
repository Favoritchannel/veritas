# Third-party notices

veritas itself has **no required runtime dependencies**. For the offline 3D knowledge-graph viewer
(`src/stages/build-graph.mjs`) it **vendors** two third-party libraries as pre-built UMD bundles, which are
redistributed in this repository under the terms below. Their copyright and permission notices are reproduced here
as their MIT licenses require.

| Library | Version | Author / Copyright | License | Upstream |
|---|---|---|---|---|
| **three.js** | r160-series build (`src/templates/graph/_three.js`) | © 2010–2023 Three.js Authors | MIT | https://github.com/mrdoob/three.js |
| **3d-force-graph** | 1.80.0 (`src/templates/graph/_3dfg.js`) | © 2017 Vasco Asturiano | MIT | https://github.com/vasturiano/3d-force-graph |

The **3d-force-graph** UMD build additionally bundles its own dependencies (including `three-forcegraph`,
`d3-force-3d`, `d3-drag`, `d3-zoom`, `tinycolor2` and others by Vasco Asturiano, Mike Bostock and contributors),
each of which is distributed under its own permissive open-source license (MIT / ISC / BSD). Those licenses travel
with the bundled code and are retained in full.

An **optional** dev/collection dependency, [Playwright](https://github.com/microsoft/playwright) (© Microsoft,
Apache-2.0), is declared in `package.json` as an `optionalDependency`; it is **not** vendored or redistributed here
and is only installed if you choose to use the `web` source collector.

---

## three.js — MIT License

```
Copyright © 2010–2023 Three.js Authors

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

## 3d-force-graph — MIT License

```
Copyright © 2017 Vasco Asturiano

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```
