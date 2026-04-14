package com.paisabudget.security;

import com.paisabudget.entity.User;
import com.paisabudget.repository.UserRepository;
import org.springframework.security.core.userdetails.*;
import org.springframework.stereotype.Service;

import java.util.Collections;

@Service
public class UserDetailsServiceImpl implements UserDetailsService {

    private final UserRepository userRepository;

    public UserDetailsServiceImpl(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @Override
    public UserDetails loadUserByUsername(String phone) throws UsernameNotFoundException {
        User user = userRepository.findByPhone(phone)
                .orElseThrow(() -> new UsernameNotFoundException("User not found: " + phone));
        return new org.springframework.security.core.userdetails.User(
                user.getPhone(), user.getPassword(), Collections.emptyList());
    }

    public UserDetails loadUserById(Long id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new UsernameNotFoundException("User not found: " + id));
        return new org.springframework.security.core.userdetails.User(
                String.valueOf(user.getId()), user.getPassword(), Collections.emptyList());
    }
}
