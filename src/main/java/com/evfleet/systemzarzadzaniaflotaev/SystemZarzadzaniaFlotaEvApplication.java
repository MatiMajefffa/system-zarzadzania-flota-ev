package com.evfleet.systemzarzadzaniaflotaev;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class SystemZarzadzaniaFlotaEvApplication {

    public static void main(String[] args) {
        SpringApplication.run(SystemZarzadzaniaFlotaEvApplication.class, args);
    }

}
