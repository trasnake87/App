package com.expensify.chat.customairshipextender;

import android.content.Context;
import androidx.annotation.NonNull;
import com.urbanairship.Airship;
import com.urbanairship.android.framework.proxy.AirshipPluginExtender;
import com.urbanairship.preferencecenter.PreferenceCenter;
import com.urbanairship.push.PushManager;

public class CustomAirshipExtender implements AirshipPluginExtender {
    @Override
    public void onAirshipReady(@NonNull Context context) {
        PushManager pushManager = Airship.getPush();

        CustomNotificationProvider notificationProvider = new CustomNotificationProvider(context, Airship.getAirshipConfigOptions());
        pushManager.setNotificationProvider(notificationProvider);

        // Guard against the HybridApp crash APP-8MB. When an Airship preference-center open request
        // arrives without a valid preference-center id, the SDK still starts its built-in
        // PreferenceCenterActivity, whose onCreate does requireNotNull(getStringExtra(EXTRA_ID)) and
        // throws "IllegalArgumentException: Missing required extra: EXTRA_ID", which Android wraps in a
        // fatal RuntimeException. This extender runs on the Airship-ready path (before the RN/JS bridge
        // and during headless/cold-start launches), so it is the only place that can intercept the open
        // in time. Consume opens with a null/blank id so the activity is never started; return false for
        // a real id so the SDK keeps its default handling untouched.
        PreferenceCenter.shared().setOpenListener(preferenceCenterId ->
                preferenceCenterId == null || preferenceCenterId.trim().isEmpty());
    }
}
