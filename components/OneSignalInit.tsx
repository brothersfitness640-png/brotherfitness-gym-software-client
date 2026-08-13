"use client";

import Script from "next/script";

export default function OneSignalInit() {
  const appId =
    process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID ||
    "24643e60-bd2d-4e83-820b-b0d2f7078e33";

  return (
    <>
      <Script
        src="https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js"
        strategy="afterInteractive"
      />
      <Script id="onesignal-init" strategy="afterInteractive">
        {`
          window.OneSignalDeferred = window.OneSignalDeferred || [];
          OneSignalDeferred.push(async function(OneSignal) {
            await OneSignal.init({
              appId: "${appId}",
              allowLocalhostAsSecureOrigin: true,
              slidedown: {
                prompts: [
                  {
                    type: "push",
                    autoPrompt: true,
                    text: {
                      actionMessage: "Allow notifications to receive your Brother's Fitness verification codes.",
                      acceptButton: "Allow Notifications",
                      cancelButton: "Later",
                    },
                  },
                ],
              },
            });

            // Trigger prompt on load if permission is not granted
            if (OneSignal.Notifications?.permission !== true) {
              try {
                if (OneSignal.Slidedown?.promptPush) {
                  await OneSignal.Slidedown.promptPush();
                } else if (OneSignal.Notifications?.requestPermission) {
                  await OneSignal.Notifications.requestPermission();
                }
              } catch (e) {
                console.log("Auto prompt note:", e);
              }
            }
          });
        `}
      </Script>
    </>
  );
}
