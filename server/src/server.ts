import app from "./app";
import config from "./config/env";

app.listen(config.PORT, () => {
  console.log(`Elios server running on http://localhost:${config.PORT}`);
});
