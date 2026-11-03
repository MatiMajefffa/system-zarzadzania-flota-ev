package com.evfleet.systemzarzadzaniaflotaev.security;

import com.evfleet.systemzarzadzaniaflotaev.model.User;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Component;

@Component
public class SecurityUtils {

    public static User getCurrentUser() {
        var authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication != null && authentication.getPrincipal() instanceof User) {
            return (User) authentication.getPrincipal();
        }
        throw new UsernameNotFoundException("Brak zautoryzowanego użytkownika w kontekście.");
    }

    public static Long getCurrentUserId() {
        return getCurrentUser().getId();
    }
}