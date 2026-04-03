import { SatoriOptions } from 'satori';
import { QuartzEmitterPlugin, ThemeKey, GlobalConfiguration, FullSlug } from '@quartz-community/types';
export { QuartzEmitterPlugin } from '@quartz-community/types';
import { JSX } from 'preact';

type Frontmatter = {
    title?: string;
    description?: string;
    socialDescription?: string;
    socialImage?: string;
    tags?: string[];
} & Record<string, unknown>;
type LocalQuartzPluginData = {
    slug?: FullSlug;
    frontmatter?: Frontmatter;
    description?: string;
    text?: string;
    filePath?: string;
    dates?: Record<string, Date>;
};
type SocialImageOptions = {
    colorScheme: ThemeKey;
    height: number;
    width: number;
    excludeRoot: boolean;
    defaultTitle?: string;
    defaultDescription?: string;
    readingTimeText?: (minutes: number) => string;
    imageStructure: (options: ImageOptions & {
        userOpts: UserOpts;
        iconBase64?: string;
    }) => JSX.Element;
};
type UserOpts = Omit<SocialImageOptions, "imageStructure">;
type ImageOptions = {
    title: string;
    description: string;
    fonts: SatoriOptions["fonts"];
    cfg: GlobalConfiguration;
    fileData: LocalQuartzPluginData;
};
declare const CustomOgImagesEmitterName = "CustomOgImages";
declare const CustomOgImages: QuartzEmitterPlugin<Partial<SocialImageOptions>>;

export { CustomOgImages, CustomOgImagesEmitterName, type ImageOptions, type SocialImageOptions, type UserOpts };
