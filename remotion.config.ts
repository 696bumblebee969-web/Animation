import { Config } from '@remotion/cli/config';

Config.setVideoImageFormat('png');
Config.setChromiumOpenGlRenderer('angle');
Config.setDelayRenderTimeoutInMilliseconds(120000);
Config.setConcurrency(4);
Config.setOverwriteOutput(true);
Config.setCrf(14);
