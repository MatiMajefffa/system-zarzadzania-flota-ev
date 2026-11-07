package com.evfleet.systemzarzadzaniaflotaev.repository;

import com.evfleet.systemzarzadzaniaflotaev.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Long> {

    // Metoda do wyszukiwania użytkownika po adresie e-mail
    Optional<User> findByEmail(String email);

}