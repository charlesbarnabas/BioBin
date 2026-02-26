#include <stdio.h>
#include <string.h>
#include "freertos/FreeRTOS.h"
#include "freertos/task.h"
#include "driver/gpio.h"
#include "esp_adc/adc_oneshot.h"
#include "esp_log.h"
#include "esp_wifi.h"
#include "esp_event.h"
#include "nvs_flash.h"
#include "esp_http_client.h"
#include "esp_crt_bundle.h"
#include <dht.h>

// KONFIGURASI
#define WIFI_SSID "hottspot"
#define WIFI_PASS "Password"
#define API_URL  "https://www.erlanggabriawa.my.id/index.php"


float g_hum = 0, g_temp = 0;
int g_gas = 0;


#if defined(CONFIG_EXAMPLE_TYPE_DHT11)
#define SENSOR_TYPE DHT_TYPE_DHT11
#endif
#if defined(CONFIG_EXAMPLE_TYPE_AM2301)
#define SENSOR_TYPE DHT_TYPE_AM2301
#endif
#if defined(CONFIG_EXAMPLE_TYPE_SI7021)
#define SENSOR_TYPE DHT_TYPE_SI7021
#endif
#ifndef SENSOR_TYPE
#define SENSOR_TYPE DHT_TYPE_DHT22
#endif


// MQ135
#define ADC_UNIT           ADC_UNIT_1
#define ADC_CHANNEL        ADC_CHANNEL_6 
#define ADC_ATTEN          ADC_ATTEN_DB_12

void wifi_init() {
    nvs_flash_init();
    esp_netif_init();
    esp_event_loop_create_default();
    esp_netif_create_default_wifi_sta();
    wifi_init_config_t cfg = WIFI_INIT_CONFIG_DEFAULT();
    esp_wifi_init(&cfg);
    wifi_config_t wifi_config = { .sta = {.ssid = WIFI_SSID, .password = WIFI_PASS} };
    esp_wifi_set_mode(WIFI_MODE_STA);
    esp_wifi_set_config(WIFI_IF_STA, &wifi_config);
    esp_wifi_start();
    esp_wifi_connect();
}

void send_to_web_task(void *pvParameters) {
    char post_data[128];
    while (1) {
        if (g_temp != 0) { 
            esp_http_client_config_t config = { .url = API_URL, .method = HTTP_METHOD_POST, .crt_bundle_attach = esp_crt_bundle_attach };
            esp_http_client_handle_t client = esp_http_client_init(&config);
            
            sprintf(post_data, "{\"temp\":%.1f,\"hum\":%.1f,\"gas\":%d}", g_temp, g_hum, g_gas);
            
            esp_http_client_set_header(client, "Content-Type", "application/json");
            esp_http_client_set_post_field(client, post_data, strlen(post_data));
            esp_http_client_perform(client);
            esp_http_client_cleanup(client);
        }
        vTaskDelay(pdMS_TO_TICKS(3000));
    }
}

void dht_test(void *pvParameters) {
    float temperature, humidity;
    while (1) {
        if (dht_read_float_data(SENSOR_TYPE, 4, &humidity, &temperature) == ESP_OK) {
            printf("Humidity: %.1f%% Temp: %.1fC\n", humidity, temperature);
            g_hum = humidity; g_temp = temperature; // Update global
        } else printf("Could not read data from sensor DHT\n");
        vTaskDelay(pdMS_TO_TICKS(2000));
    }
}

void mq135_test(void *pvParameters) {
    adc_oneshot_unit_handle_t adc1_handle = *(adc_oneshot_unit_handle_t *)pvParameters;
    while (1) {
        int raw_value;
        if (adc_oneshot_read(adc1_handle, ADC_CHANNEL, &raw_value) == ESP_OK) {
            float voltage = (raw_value * 3.3) / 4095.0;
            printf("MQ135 Raw: %d | Voltage: %.2fV\n", raw_value, voltage);
            g_gas = raw_value; // Update global
        }
        vTaskDelay(pdMS_TO_TICKS(1000));
    }
}

void app_main() {
    wifi_init();
    adc_oneshot_unit_handle_t adc1_handle;
    adc_oneshot_unit_init_cfg_t init_config1 = { .unit_id = ADC_UNIT };
    adc_oneshot_new_unit(&init_config1, &adc1_handle);
    adc_oneshot_chan_cfg_t config = { .bitwidth = ADC_BITWIDTH_DEFAULT, .atten = ADC_ATTEN };
    adc_oneshot_config_channel(adc1_handle, ADC_CHANNEL, &config);

    xTaskCreate(dht_test, "dht_test", 4096, NULL, 5, NULL);
    xTaskCreate(mq135_test, "mq135_test", 4096, &adc1_handle, 5, NULL);
    xTaskCreate(send_to_web_task, "send_web", 8192, NULL, 5, NULL);
}