import { find, findByName, findByProps } from "@vendetta/metro";
import { after, instead } from "@vendetta/patcher";
import { getAssetIDByName } from "@vendetta/ui/assets";
import { storage } from "@vendetta/plugin";
import Settings from "./settings";

let patches: (() => void)[] = [];

function isAddFriendButton(button: any) {
    const props = button?.props;

    if (!props) return false;

    const labels = [
        props.accessibilityLabel,
        props.label,
        props.text,
        props?.children?.props?.accessibilityLabel,
        props?.children?.props?.label,
    ];

    return labels.some(
        (x) =>
            typeof x === "string" &&
            x.toLowerCase().replace(/\s+/g, " ").includes("add friend"),
    );
}

function removeAddFriend(buttons: any) {
    if (!Array.isArray(buttons)) return;

    for (let i = buttons.length - 1; i >= 0; i--) {
        const button = buttons[i];

        if (isAddFriendButton(button)) {
            buttons.splice(i, 1);
            continue;
        }

        // Some Discord versions put the actual button inside children.
        if (button?.props?.children) {
            const children = button.props.children;

            if (Array.isArray(children)) {
                for (let j = children.length - 1; j >= 0; j--) {
                    if (isAddFriendButton(children[j])) {
                        children.splice(j, 1);
                    }
                }
            } else if (isAddFriendButton(children)) {
                button.props.children = null;
            }
        }
    }
}

export default {
    onLoad: () => {
        storage.upHideVoiceButton ??= true;
        storage.upHideVideoButton ??= true;
        storage.hideAddFriend ??= true;

        storage.dmHideCallButton ??= false;
        storage.dmHideVideoButton ??= false;
        storage.hideVCVideoButton ??= false;

        let videoCallAsset = getAssetIDByName("ic_video");
        let voiceCallAsset = getAssetIDByName("ic_audio");

        const videoAsset = getAssetIDByName("video");
        const callAsset = getAssetIDByName("nav_header_connect");
        const videoAsset2 = getAssetIDByName("VideoIcon");
        const callAsset2 = getAssetIDByName("PhoneCallIcon");

        if (videoCallAsset === undefined)
            videoCallAsset = videoAsset2;

        if (voiceCallAsset === undefined)
            voiceCallAsset = callAsset2;

        const UserProfileActions = findByName(
            "UserProfileActions",
            false,
        );

        let SimplifiedUserProfileContactButtons = findByName(
            "SimplifiedUserProfileContactButtons",
            false,
        );

        if (SimplifiedUserProfileContactButtons === undefined) {
            SimplifiedUserProfileContactButtons = findByName(
                "UserProfileContactButtons",
                false,
            );
        }

        const PrivateChannelButtons = find(
            (x) => x?.type?.name == "PrivateChannelButtons",
        );

        const ChannelButtons = findByProps("ChannelButtons");

        const VideoButton = findByName("VideoButton", false);

        /*
         * User Profile
         */
        if (UserProfileActions !== undefined) {
            patches.push(
                after(
                    "default",
                    UserProfileActions,
                    (_, component) => {
                        if (
                            !storage.upHideVideoButton &&
                            !storage.upHideVoiceButton &&
                            !storage.hideAddFriend
                        )
                            return;

                        let buttons =
                            component?.props?.children?.props?.children?.[1]
                                ?.props?.children;

                        if (buttons === undefined) {
                            buttons =
                                component?.props?.children?.[1]?.props
                                    ?.children;
                        }

                        if (buttons?.props?.children !== undefined) {
                            buttons = buttons.props.children;
                        }

                        if (buttons === undefined) return;

                        /*
                         * Hide Add Friend
                         */
                        if (storage.hideAddFriend) {
                            removeAddFriend(buttons);
                        }

                        /*
                         * Hide Call / Video
                         */
                        for (let idx = buttons.length - 1; idx >= 0; idx--) {
                            const button = buttons[idx];

                            if (!button) continue;

                            if (
                                (button?.props?.icon === voiceCallAsset &&
                                    storage.upHideVoiceButton) ||
                                (button?.props?.icon === videoCallAsset &&
                                    storage.upHideVideoButton)
                            ) {
                                buttons.splice(idx, 1);
                            }

                            if (button?.props?.children) {
                                const children =
                                    button.props.children;

                                if (Array.isArray(children)) {
                                    for (
                                        let idx2 = children.length - 1;
                                        idx2 >= 0;
                                        idx2--
                                    ) {
                                        const btn = children[idx2];

                                        if (
                                            (btn?.props?.icon ===
                                                voiceCallAsset &&
                                                storage.upHideVoiceButton) ||
                                            (btn?.props?.icon ===
                                                videoCallAsset &&
                                                storage.upHideVideoButton)
                                        ) {
                                            children.splice(idx2, 1);
                                        }
                                    }
                                }
                            }
                        }
                    },
                ),
            );
        }

        /*
         * Simplified User Profile
         */
        if (SimplifiedUserProfileContactButtons !== undefined) {
            patches.push(
                after(
                    "default",
                    SimplifiedUserProfileContactButtons,
                    (_, component) => {
                        let buttons = component?.props?.children;

                        if (buttons === undefined) return;

                        if (storage.hideAddFriend) {
                            removeAddFriend(buttons);
                        }

                        if (storage.upHideVoiceButton) {
                            delete buttons[1];
                        }

                        if (storage.upHideVideoButton) {
                            delete buttons[2];
                        }
                    },
                ),
            );
        }

        /*
         * Voice Channel
         */
        if (VideoButton !== undefined) {
            patches.push(
                instead(
                    "default",
                    VideoButton,
                    (args, orig) => {
                        if (storage.hideVCVideoButton)
                            return null;

                        return orig.apply(this, args);
                    },
                ),
            );
        }

        /*
         * Tabs V2 DM Header
         */
        if (PrivateChannelButtons !== undefined) {
            patches.push(
                after(
                    "type",
                    PrivateChannelButtons,
                    (_, component) => {
                        if (
                            !storage.dmHideCallButton &&
                            !storage.dmHideVideoButton
                        )
                            return;

                        let buttons = component?.props?.children;

                        if (buttons === undefined) return;

                        if (
                            buttons[0]?.props?.accessibilityLabel !==
                            undefined
                        ) {
                            if (storage.dmHideCallButton)
                                delete buttons[0];

                            if (storage.dmHideVideoButton)
                                delete buttons[1];

                            return;
                        }

                        if (buttons[0]?.props?.source === undefined) {
                            buttons =
                                buttons[0]?.props?.children;
                        }

                        if (buttons === undefined) return;

                        for (
                            let idx = buttons.length - 1;
                            idx >= 0;
                            idx--
                        ) {
                            const button = buttons[idx];

                            if (
                                (button?.props?.source === callAsset &&
                                    storage.dmHideCallButton) ||
                                (button?.props?.source === videoAsset &&
                                    storage.dmHideVideoButton) ||
                                (button?.props?.source === callAsset2 &&
                                    storage.dmHideCallButton) ||
                                (button?.props?.source === videoAsset2 &&
                                    storage.dmHideVideoButton)
                            ) {
                                buttons.splice(idx, 1);
                            }
                        }
                    },
                ),
            );
        }

        /*
         * Legacy DM Header
         */
        if (ChannelButtons !== undefined) {
            patches.push(
                after(
                    "ChannelButtons",
                    ChannelButtons,
                    (_, component) => {
                        if (
                            !storage.dmHideCallButton &&
                            !storage.dmHideVideoButton
                        )
                            return;

                        const buttons = component?.props?.children;

                        if (buttons === undefined) return;

                        for (
                            let idx = buttons.length - 1;
                            idx >= 0;
                            idx--
                        ) {
                            const button =
                                buttons[idx]?.props?.children?.[0];

                            if (button === undefined) continue;

                            if (
                                (button?.props?.source === callAsset &&
                                    storage.dmHideCallButton) ||
                                (button?.props?.source === videoAsset &&
                                    storage.dmHideVideoButton)
                            ) {
                                buttons.splice(idx, 1);
                            }
                        }
                    },
                ),
            );
        }
    },

    onUnload: () => {
        for (const unpatch of patches) {
            unpatch();
        }

        patches = [];
    },

    settings: Settings,
};
