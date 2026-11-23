package com.jonbaraq.zuricheinbuergerung;

import android.graphics.Color;
import android.os.Bundle;
import android.view.View;
import android.view.Window;
import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.view.WindowInsetsControllerCompat;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        Window window = getWindow();
        if (window != null) {
            WindowCompat.setDecorFitsSystemWindows(window, false);
            window.setStatusBarColor(Color.WHITE);
            window.setNavigationBarColor(Color.WHITE);

            View decorView = window.getDecorView();
            decorView.setBackgroundColor(Color.WHITE);

            WindowInsetsControllerCompat controller = WindowCompat.getInsetsController(window, decorView);
            if (controller != null) {
                controller.show(WindowInsetsCompat.Type.systemBars());
                controller.setAppearanceLightStatusBars(true);
                controller.setAppearanceLightNavigationBars(true);
            }

            View targetView = (getBridge() != null && getBridge().getWebView() != null && getBridge().getWebView().getParent() instanceof View)
                ? (View) getBridge().getWebView().getParent()
                : findViewById(android.R.id.content);

            if (targetView != null) {
                ViewCompat.setOnApplyWindowInsetsListener(targetView, (v, windowInsets) -> {
                    Insets bars = windowInsets.getInsets(
                        WindowInsetsCompat.Type.systemBars()
                        | WindowInsetsCompat.Type.displayCutout()
                        | WindowInsetsCompat.Type.ime()
                    );
                    v.setPadding(bars.left, bars.top, bars.right, bars.bottom);
                    return WindowInsetsCompat.CONSUMED;
                });
                ViewCompat.requestApplyInsets(targetView);
            }
        }
    }
}
