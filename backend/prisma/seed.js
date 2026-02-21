"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const run = async () => {
    await import('./seed.js');
};
run().catch((error) => {
    console.error(error);
    process.exit(1);
});
//# sourceMappingURL=seed.js.map