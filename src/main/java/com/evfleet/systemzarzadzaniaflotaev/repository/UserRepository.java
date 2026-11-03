package com.evfleet.systemzarzadzaniaflotaev.repository;

import com.evfleet.systemzarzadzaniaflotaev.model.User;
import org.springframework.data.jpa.repository.JpaRepository;

public interface UserRepository extends JpaRepository<User, Long> {
    // findById(Long id) jest już wbudowane w JpaRepository
}